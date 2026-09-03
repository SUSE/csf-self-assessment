import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  closeDesktop,
  DESKTOP_SMOKE_TARGETS,
  launchDesktop,
} from './electron-harness.js';

const STORAGE_KEY = 'csf-desktop-s2-probe';

test('desktop targets keep separate stable local state across restart', async () => {
  const homeDirectory = await mkdtemp(join(tmpdir(), 'csf-desktop-profile-'));
  const authorTarget = DESKTOP_SMOKE_TARGETS.find(
    (target) => target.entry === 'author',
  );
  const assessmentTarget = DESKTOP_SMOKE_TARGETS.find(
    (target) => target.entry === 'assessment',
  );
  assert.ok(authorTarget);
  assert.ok(assessmentTarget);

  try {
    const firstAuthor = await launchDesktop(authorTarget, homeDirectory);
    const authorAppDataPath = firstAuthor.appDataPath;
    const authorUserDataPath = firstAuthor.userDataPath;
    try {
      await firstAuthor.page.evaluate(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: STORAGE_KEY, value: 'author' },
      );
    } finally {
      await closeDesktop(firstAuthor);
    }

    const firstAssessment = await launchDesktop(
      assessmentTarget,
      homeDirectory,
    );
    const assessmentAppDataPath = firstAssessment.appDataPath;
    const assessmentUserDataPath = firstAssessment.userDataPath;
    try {
      assert.notEqual(assessmentUserDataPath, authorUserDataPath);
      assert.equal(
        await firstAssessment.page.evaluate(
          (key) => localStorage.getItem(key),
          STORAGE_KEY,
        ),
        null,
      );
      await firstAssessment.page.evaluate(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: STORAGE_KEY, value: 'assessment' },
      );
    } finally {
      await closeDesktop(firstAssessment);
    }

    const secondAuthor = await launchDesktop(authorTarget, homeDirectory);
    try {
      assert.equal(secondAuthor.appDataPath, authorAppDataPath);
      assert.equal(secondAuthor.userDataPath, authorUserDataPath);
      assert.equal(
        await secondAuthor.page.evaluate(
          (key) => localStorage.getItem(key),
          STORAGE_KEY,
        ),
        'author',
      );
    } finally {
      await closeDesktop(secondAuthor);
    }

    const secondAssessment = await launchDesktop(
      assessmentTarget,
      homeDirectory,
    );
    try {
      assert.equal(secondAssessment.appDataPath, assessmentAppDataPath);
      assert.equal(secondAssessment.userDataPath, assessmentUserDataPath);
      assert.equal(
        await secondAssessment.page.evaluate(
          (key) => localStorage.getItem(key),
          STORAGE_KEY,
        ),
        'assessment',
      );
    } finally {
      await closeDesktop(secondAssessment);
    }
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

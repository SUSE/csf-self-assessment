import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  closeDesktop,
  DESKTOP_SMOKE_TARGETS,
  launchDesktop,
  withOpenDialogResult,
} from './electron-harness.js';

import {
  euCsfCalculatorWorkbookPath,
  euCsfCalculatorFillAlexPath,
  euCsfCalculatorFillJanePath,
} from './test-fixtures.js';

const WORKBOOK_PATH = euCsfCalculatorWorkbookPath;
const ALEX_PATH = euCsfCalculatorFillAlexPath;
const JANE_PATH = euCsfCalculatorFillJanePath;

test('Author opens the EC calculator and keeps its repeated SEALs apart', async () => {
  const homeDirectory = await mkdtemp(join(tmpdir(), 'csf-desktop-ec-author-'));
  const target = DESKTOP_SMOKE_TARGETS.find(
    (candidate) => candidate.entry === 'author',
  );
  assert.ok(target);

  try {
    const launch = await launchDesktop(target, homeDirectory);
    try {
      const { application, page } = launch;
      await withOpenDialogResult(
        application,
        { canceled: false, filePaths: [WORKBOOK_PATH] },
        async () => {
          await page.getByRole('button', { name: 'Import workbook' }).click();
        },
      );
      await page.getByRole('button', { name: 'Questions', exact: true }).click();
      await page.locator('[data-question="SOV-1.2"]').click();

      const seals = page.locator('[aria-label^="SEAL for rung "]');
      await seals.first().waitFor({ state: 'visible' });
      assert.equal(await seals.count(), 5);
      for (const seal of await seals.all()) {
        assert.equal(await seal.inputValue(), '4');
      }
    } finally {
      await closeDesktop(launch);
    }
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

test('Assessment merges the two EC fills', async () => {
  const homeDirectory = await mkdtemp(join(tmpdir(), 'csf-desktop-ec-assessment-'));
  const target = DESKTOP_SMOKE_TARGETS.find(
    (candidate) => candidate.entry === 'assessment',
  );
  assert.ok(target);

  try {
    const launch = await launchDesktop(target, homeDirectory);
    try {
      const { application, page } = launch;
      await withOpenDialogResult(
        application,
        { canceled: false, filePaths: [WORKBOOK_PATH] },
        async () => {
          await page
            .getByRole('main')
            .getByRole('button', { name: 'Load', exact: true })
            .click();
        },
      );

      for (const [path, action] of [
        [ALEX_PATH, 'Start merge'],
        [JANE_PATH, 'Add partial'],
      ] as const) {
        await withOpenDialogResult(
          application,
          { canceled: false, filePaths: [path] },
          async () => {
            await page.locator('header').getByLabel('Load', { exact: true }).click();
            await page
              .getByRole('alertdialog')
              .getByRole('button', { name: action, exact: true })
              .click();
          },
        );
        // One partial is under review at a time: Alex has to land before Jane
        // can be added.
        if (action === 'Start merge') {
          await page.getByRole('button', { name: 'Land', exact: true }).click();
        }
      }

      const summary = page.locator('[data-landing-summary]');
      await summary.waitFor({ state: 'visible' });
      assert.equal(
        (await summary.innerText()).trim(),
        '48 answers · 0 new units · 4 clashes · 0 decided',
      );

      const filters = page.locator('[data-queue-filters]');
      for (const name of [
        'Divergence — 2 clashes',
        'Gap — 1 clash',
        'Scope — 1 clash',
      ]) {
        await filters.getByLabel(name, { exact: true }).waitFor({ state: 'visible' });
      }
    } finally {
      await closeDesktop(launch);
    }
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

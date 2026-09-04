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

import { workbookAssessmentPath } from './test-fixtures.js';

const WORKBOOK_ASSESSMENT_PATH = workbookAssessmentPath;

const PARTICIPANT_NAME = 'Desktop S2 assessment';

async function expectParticipantName(
  page: Awaited<ReturnType<typeof launchDesktop>>['page'],
): Promise<void> {
  const nameInput = page.getByRole('textbox', { name: /^your name$/i });
  await nameInput.waitFor({ state: 'visible' });
  assert.equal(await nameInput.inputValue(), PARTICIPANT_NAME);
}

test('Assessment restores a participant and Reset clears the app', async () => {
  const homeDirectory = await mkdtemp(join(tmpdir(), 'csf-desktop-assessment-'));
  const target = DESKTOP_SMOKE_TARGETS.find(
    (candidate) => candidate.entry === 'assessment',
  );
  assert.ok(target);

  try {
    const firstLaunch = await launchDesktop(target, homeDirectory);
    try {
      const { application, page } = firstLaunch;
      await withOpenDialogResult(
        application,
        { canceled: false, filePaths: [WORKBOOK_ASSESSMENT_PATH] },
        async () => {
          await page
            .getByRole('main')
            .getByRole('button', { name: 'Load', exact: true })
            .click();
          const nameInput = page.getByRole('textbox', { name: /^your name$/i });
          await nameInput.fill(PARTICIPANT_NAME);
          await nameInput.press('Enter');
        },
      );
      await expectParticipantName(page);

      await page
        .getByRole('button', { name: 'Change colour palette' })
        .click();
      await page
        .getByRole('menuitemradio', { name: /^Supabase/ })
        .click();
      await page.waitForFunction(() =>
        document.documentElement.classList.contains('theme-supabase'),
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains('theme-supabase'),
        ),
        true,
      );
    } finally {
      await closeDesktop(firstLaunch);
    }

    const secondLaunch = await launchDesktop(target, homeDirectory);
    try {
      const { page } = secondLaunch;
      await expectParticipantName(page);
      await page.waitForFunction(() =>
        document.documentElement.classList.contains('theme-supabase'),
      );
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.classList.contains('theme-supabase'),
        ),
        true,
      );

      // A restart restores app-local data, not the view position.
      // This matches a fresh browser tab.
      const overviewButton = page.getByRole('button', {
        name: 'Overview',
        exact: true,
      });
      await overviewButton.waitFor({ state: 'visible' });
      assert.equal(await overviewButton.getAttribute('aria-pressed'), 'true');
      const questionsButton = page.getByRole('button', {
        name: 'Current question',
        exact: true,
      });
      assert.equal(await questionsButton.getAttribute('aria-pressed'), 'false');

      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await page
        .getByRole('button', { name: 'Reset everything', exact: true })
        .click();
      await page
        .getByRole('heading', { name: 'Nothing loaded', exact: true })
        .waitFor({ state: 'visible' });
    } finally {
      await closeDesktop(secondLaunch);
    }

    const thirdLaunch = await launchDesktop(target, homeDirectory);
    try {
      await thirdLaunch.page
        .getByRole('heading', { name: 'Nothing loaded', exact: true })
        .waitFor({ state: 'visible' });
    } finally {
      await closeDesktop(thirdLaunch);
    }
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { ElectronApplication, Locator, Page } from 'playwright';

import {
  closeDesktop,
  DESKTOP_SMOKE_TARGETS,
  launchDesktop,
  withOpenDialogResult,
} from './electron-harness.js';

import { csfWorkbookPath } from './test-fixtures.js';

const WORKBOOK_PATH = csfWorkbookPath;

async function inputWithValue(page: Page, value: string): Promise<Locator> {
  await page.waitForFunction(
    (expected) =>
      [...document.querySelectorAll('input')].some(
        (input) => input.value === expected,
      ),
    value,
  );
  for (const input of await page.locator('input').all()) {
    if ((await input.inputValue()) === value) {
      return input;
    }
  }
  throw new Error(`Expected an input with value “${value}”`);
}

async function pressDesktopHistoryShortcut(
  application: ElectronApplication,
  keyCode: '[' | ']',
): Promise<void> {
  await application.evaluate(({ BrowserWindow }, key) => {
    const [window] = BrowserWindow.getAllWindows();
    if (window === undefined) {
      throw new Error('Expected one desktop window');
    }
    window.webContents.sendInputEvent({
      type: 'keyDown',
      keyCode: key,
      modifiers: ['meta'],
    });
  }, keyCode);
}

test('Author keeps its draft and theme and exposes browser history and print', async () => {
  const homeDirectory = await mkdtemp(join(tmpdir(), 'csf-desktop-author-'));
  const target = DESKTOP_SMOKE_TARGETS.find(
    (candidate) => candidate.entry === 'author',
  );
  assert.ok(target);

  try {
    const firstLaunch = await launchDesktop(target, homeDirectory);
    try {
      const { application, page } = firstLaunch;
      const titleInput = await withOpenDialogResult(
        application,
        { canceled: false, filePaths: [WORKBOOK_PATH] },
        async () => {
          await page.getByRole('button', { name: 'Import workbook' }).click();
          await page.getByRole('button', { name: 'Overview', exact: true }).click();
          return inputWithValue(page, 'Cloud Sovereignty Self-Assessment');
        },
      );
      await titleInput.fill('Desktop S2 author draft');
      await page
        .getByRole('button', { name: 'Switch to dark theme' })
        .click();
      await page
        .getByRole('button', { name: 'Change colour palette' })
        .click();
      await page
        .getByRole('menuitemradio', { name: /^Clean Slate/ })
        .click();

      assert.deepEqual(
        await page.evaluate(() => ({
          dark: document.documentElement.classList.contains('dark'),
          cleanSlate:
            document.documentElement.classList.contains('theme-cleanslate'),
        })),
        { dark: true, cleanSlate: true },
      );

      await page
        .getByRole('button', {
          name: 'Read a test estate on the dashboard',
        })
        .click();
      await page
        .getByRole('button', {
          name: 'Read the Report this estate prints',
        })
        .click();

      await pressDesktopHistoryShortcut(application, '[');
      await page.waitForFunction(
        (mode) => history.state?.__csfView?.mode === mode,
        'dashboard',
      );
      assert.equal(
        await page.evaluate(() => history.state.__csfView.mode),
        'dashboard',
      );

      await pressDesktopHistoryShortcut(application, ']');
      await page.waitForFunction(
        (mode) => history.state?.__csfView?.mode === mode,
        'report',
      );
      assert.equal(
        await page.evaluate(() => history.state.__csfView.mode),
        'report',
      );

      await page.evaluate(() => {
        document.documentElement.dataset.printCalls = '0';
        window.print = () => {
          const current = Number(
            document.documentElement.dataset.printCalls ?? '0',
          );
          document.documentElement.dataset.printCalls = String(current + 1);
        };
      });
      const beforePrint = await page.evaluate(() => ({
        title: document.title,
        dark: document.documentElement.classList.contains('dark'),
      }));
      await page.getByRole('button', { name: 'Print', exact: true }).click();
      assert.deepEqual(
        await page.evaluate(() => ({
          calls: Number(document.documentElement.dataset.printCalls ?? '0'),
          title: document.title,
          dark: document.documentElement.classList.contains('dark'),
        })),
        { calls: 1, ...beforePrint },
      );
    } finally {
      await closeDesktop(firstLaunch);
    }

    const secondLaunch = await launchDesktop(target, homeDirectory);
    try {
      const overview = secondLaunch.page.getByRole('button', {
        name: 'Overview',
        exact: true,
      });
      await overview.waitFor({ state: 'visible' });
      await secondLaunch.page.waitForFunction(
        () =>
          document.documentElement.classList.contains('dark') &&
          document.documentElement.classList.contains('theme-cleanslate'),
      );
      assert.deepEqual(
        await secondLaunch.page.evaluate(() => ({
          dark: document.documentElement.classList.contains('dark'),
          cleanSlate:
            document.documentElement.classList.contains('theme-cleanslate'),
        })),
        { dark: true, cleanSlate: true },
      );
      await overview.click();
      await (
        await inputWithValue(secondLaunch.page, 'Desktop S2 author draft')
      ).waitFor({ state: 'visible' });
    } finally {
      await closeDesktop(secondLaunch);
    }
  } finally {
    await rm(homeDirectory, { recursive: true, force: true });
  }
});

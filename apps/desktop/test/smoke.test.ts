import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { DesktopBridge } from '../src/bridge-contract.js';
import { desktopUserDataPath } from '../src/profile.js';
import {
  closeDesktop,
  DESKTOP_SMOKE_TARGETS,
  launchDesktop,
  withOpenDialogResult,
  withSaveDialogResult,
} from './electron-harness.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Electron {
    interface WebContents {
      getLastWebPreferences(): WebPreferences;
    }
  }

  interface Window {
    csfDesktop?: DesktopBridge;
  }
}

for (const target of DESKTOP_SMOKE_TARGETS) {
  test(`${target.target.productName} runs in the locked desktop shell`, async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), `csf-desktop-${target.entry}-`),
    );
    const openedPath = join(temporaryDirectory, 'opened.json');
    const openedText = `{"target":"${target.entry}","label":"Grüße"}`;
    await writeFile(openedPath, openedText, 'utf8');

    try {
      const launch = await launchDesktop(target, temporaryDirectory);

      try {
        const { application, page } = launch;
        assert.equal(
          launch.userDataPath,
          desktopUserDataPath(target.target, launch.appDataPath),
        );
        assert.equal(
          await application.evaluate(({ app }) => app.getName()),
          target.target.productName,
        );
        assert.equal(application.windows().length, 1);
        assert.equal(page.url(), target.target.startUrl);
        assert.equal(await page.title(), target.documentTitle);
        const heading = page.getByRole('heading', {
          name: target.emptyHeading,
        });
        await heading.waitFor({ state: 'visible' });
        assert.equal(await heading.isVisible(), true);
        assert.equal(
          await application.evaluate(
            ({ Menu }) => Menu.getApplicationMenu() === null,
          ),
          true,
        );

        const webPreferences = await application.evaluate(({ BrowserWindow }) => {
          const [window] = BrowserWindow.getAllWindows();
          if (window === undefined) {
            return null;
          }
          const preferences = window.webContents.getLastWebPreferences();
          return {
            nodeIntegration: preferences.nodeIntegration,
            contextIsolation: preferences.contextIsolation,
            sandbox: preferences.sandbox,
            webSecurity: preferences.webSecurity,
            allowRunningInsecureContent:
              preferences.allowRunningInsecureContent,
            webviewTag: preferences.webviewTag,
            preload: preferences.preload ?? null,
          };
        });

        assert.deepEqual(webPreferences, {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
          webviewTag: false,
          preload: null,
        });
        assert.equal(
          await application.evaluate(({ BrowserWindow }) => {
            const [window] = BrowserWindow.getAllWindows();
            if (window === undefined) {
              return false;
            }
            window.webContents.openDevTools();
            return window.webContents.isDevToolsOpened() === false;
          }),
          true,
        );
        assert.deepEqual(
          await page.evaluate(() => {
            const bridge = window.csfDesktop;
            return {
              require: 'require' in globalThis,
              ipcRenderer: 'ipcRenderer' in globalThis,
              bridge:
                bridge === undefined
                  ? null
                  : {
                      keys: Object.keys(bridge).sort(),
                      openType: typeof bridge.openJsonFile,
                      saveType: typeof bridge.saveJsonFile,
                      frozen: Object.isFrozen(bridge),
                      hasPath: 'path' in bridge,
                    },
            };
          }),
          {
            require: false,
            ipcRenderer: false,
            bridge: {
              keys: ['openJsonFile', 'saveJsonFile'],
              openType: 'function',
              saveType: 'function',
              frozen: true,
              hasPath: false,
            },
          },
        );

        const opened = await withOpenDialogResult(
          application,
          { canceled: false, filePaths: [openedPath] },
          () =>
            page.evaluate(async () => {
              const bridge = window.csfDesktop;
              if (bridge === undefined) {
                throw new Error('Desktop bridge is missing');
              }
              const result = await bridge.openJsonFile();
              return result === null
                ? null
                : { result, keys: Object.keys(result).sort() };
            }),
        );
        assert.deepEqual(opened, {
          result: { name: 'opened.json', text: openedText },
          keys: ['name', 'text'],
        });

        const savedPath = join(temporaryDirectory, 'saved.json');
        const savedText = `{"saved":"${target.entry}-✓"}`;
        await withSaveDialogResult(
          application,
          { canceled: false, filePath: savedPath, suggestedName: 'saved.json' },
          () =>
            page.evaluate(async (text) => {
              const bridge = window.csfDesktop;
              if (bridge === undefined) {
                throw new Error('Desktop bridge is missing');
              }
              await bridge.saveJsonFile({ suggestedName: 'saved.json', text });
            }, savedText),
        );
        assert.equal(await readFile(savedPath, 'utf8'), savedText);

        assert.equal(
          await withOpenDialogResult(
            application,
            { canceled: true, filePaths: [] },
            () =>
              page.evaluate(async () => {
                const bridge = window.csfDesktop;
                if (bridge === undefined) {
                  throw new Error('Desktop bridge is missing');
                }
                return bridge.openJsonFile();
              }),
          ),
          null,
        );

        const cancelledSavePath = join(temporaryDirectory, 'cancelled.json');
        await withSaveDialogResult(
          application,
          {
            canceled: true,
            filePath: cancelledSavePath,
            suggestedName: 'cancelled.json',
          },
          () =>
            page.evaluate(async () => {
              const bridge = window.csfDesktop;
              if (bridge === undefined) {
                throw new Error('Desktop bridge is missing');
              }
              await bridge.saveJsonFile({
                suggestedName: 'cancelled.json',
                text: '{}',
              });
            }),
        );
        await assert.rejects(readFile(cancelledSavePath, 'utf8'));

        const missingReadPath = join(temporaryDirectory, 'missing.json');
        await assert.rejects(
          withOpenDialogResult(
            application,
            { canceled: false, filePaths: [missingReadPath] },
            () =>
              page.evaluate(async () => {
                const bridge = window.csfDesktop;
                if (bridge === undefined) {
                  throw new Error('Desktop bridge is missing');
                }
                return bridge.openJsonFile();
              }),
          ),
        );

        const missingWritePath = join(
          temporaryDirectory,
          'missing-directory',
          'failed.json',
        );
        await assert.rejects(
          withSaveDialogResult(
            application,
            {
              canceled: false,
              filePath: missingWritePath,
              suggestedName: 'failed.json',
            },
            () =>
              page.evaluate(async () => {
                const bridge = window.csfDesktop;
                if (bridge === undefined) {
                  throw new Error('Desktop bridge is missing');
                }
                await bridge.saveJsonFile({
                  suggestedName: 'failed.json',
                  text: '{}',
                });
              }),
          ),
        );

        await assert.rejects(
          page.evaluate(() =>
            fetch('https://example.invalid/desktop-s0-fetch'),
          ),
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.open('https://example.invalid/desktop-s0-window') === null,
          ),
          true,
        );
        assert.equal(application.windows().length, 1);
        await assert.rejects(
          page.goto('https://example.invalid/desktop-s0-navigation'),
          /ERR_BLOCKED_BY_CLIENT/,
        );
      } finally {
        await closeDesktop(launch);
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
}

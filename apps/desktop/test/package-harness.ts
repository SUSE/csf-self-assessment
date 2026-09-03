import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { extractFile, listPackage } from '@electron/asar';
import { z } from 'zod';

import type {
  DesktopApplication,
  ReleaseVersion,
} from '../release/contract.js';
import type { DesktopBridge } from '../src/bridge-contract.js';
import {
  closeDesktop,
  launchPackagedDesktop,
  withOpenDialogResult,
  withSaveDialogResult,
} from './electron-harness.js';
import type {
  DesktopLaunch,
  PackagedDesktopLaunchInput,
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

export type PackagedApplication = {
  app: DesktopApplication;
  executablePath: string;
  resourcesDirectory: string;
  sourceRendererPath: string;
  packagedRendererPath: string;
  absentRendererPath: string;
};

const execFileAsync = promisify(execFile);
const WindowsIconSchema = z
  .object({
    equal: z.literal(true),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
const PackageMetadataSchema = z
  .object({
    name: z.enum(['csf-author', 'csf-assessment']),
    productName: z.enum(['CSF Author', 'CSF Assessment']).optional(),
    version: z.string().min(1),
    description: z.string().min(1),
    author: z.literal('CSF Self Assessment'),
    repository: z.literal('https://github.com/ravan/csf-self-assessment-tools'),
    main: z.string().min(1),
  })
  .passthrough();

function documentTitle(app: DesktopApplication): string {
  return app.kind === 'author'
    ? 'Cloud Sovereignty Self-Assessment — Author'
    : 'Cloud Sovereignty Self-Assessment';
}

function emptyHeading(app: DesktopApplication): string {
  return app.kind === 'author' ? 'No workbook' : 'Nothing loaded';
}

async function assertWindowsIcon(packaged: PackagedApplication): Promise<void> {
  const committedIconPath = fileURLToPath(
    new URL(
      `../release/icons/generated/${packaged.app.kind}/icon.ico`,
      import.meta.url,
    ),
  );
  const script = [
    'Add-Type -AssemblyName System.Drawing',
    '$executableIcon = [System.Drawing.Icon]::ExtractAssociatedIcon($env:CSF_EXECUTABLE_PATH)',
    '$committedIcon = [System.Drawing.Icon]::new($env:CSF_COMMITTED_ICON_PATH, $executableIcon.Width, $executableIcon.Height)',
    '$executableBitmap = $executableIcon.ToBitmap()',
    '$committedBitmap = $committedIcon.ToBitmap()',
    '$equal = $executableBitmap.Width -eq $committedBitmap.Width -and $executableBitmap.Height -eq $committedBitmap.Height',
    ':pixels for ($y = 0; $equal -and $y -lt $executableBitmap.Height; $y += 1) { for ($x = 0; $x -lt $executableBitmap.Width; $x += 1) { if ($executableBitmap.GetPixel($x, $y).ToArgb() -ne $committedBitmap.GetPixel($x, $y).ToArgb()) { $equal = $false; break pixels } } }',
    '@{ equal = $equal; width = $executableBitmap.Width; height = $executableBitmap.Height } | ConvertTo-Json -Compress',
  ].join('\n');
  const result = await execFileAsync(
    'pwsh.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      env: {
        ...process.env,
        CSF_EXECUTABLE_PATH: packaged.executablePath,
        CSF_COMMITTED_ICON_PATH: committedIconPath,
      },
    },
  );
  WindowsIconSchema.parse(JSON.parse(result.stdout));
}

export async function assertPackagedComposition(
  packaged: PackagedApplication,
  version: ReleaseVersion,
): Promise<void> {
  const archivePath = join(packaged.resourcesDirectory, 'app.asar');
  const metadata = PackageMetadataSchema.parse(
    JSON.parse(extractFile(archivePath, 'package.json').toString('utf8')),
  );
  assert.deepEqual(
    {
      name: metadata.name,
      productName: metadata.productName,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      repository: metadata.repository,
      main: metadata.main,
    },
    {
      name: packaged.app.packageName,
      productName:
        process.platform === 'linux' ? undefined : packaged.app.productName,
      version,
      description: packaged.app.description,
      author: 'CSF Self Assessment',
      repository: 'https://github.com/ravan/csf-self-assessment-tools',
      main: `dist/src/${packaged.app.kind}.js`,
    },
  );

  assert.deepEqual(
    await readFile(packaged.packagedRendererPath),
    await readFile(packaged.sourceRendererPath),
  );
  await assert.rejects(readFile(packaged.absentRendererPath), { code: 'ENOENT' });

  if (process.platform === 'darwin') {
    const committedIcon = new URL(
      `../release/icons/generated/${packaged.app.kind}/icon.icns`,
      import.meta.url,
    );
    assert.deepEqual(
      await readFile(join(packaged.resourcesDirectory, 'icon.icns')),
      await readFile(committedIcon),
    );
  }
  if (process.platform === 'win32') {
    await assertWindowsIcon(packaged);
  }

  const entries = new Set(
    listPackage(archivePath, { isPack: false }).map((entry) =>
      entry.replaceAll('\\', '/'),
    ),
  );
  const matchingEntry = `/dist/src/${packaged.app.kind}.js`;
  const siblingEntry = `/dist/src/${
    packaged.app.kind === 'author' ? 'assessment' : 'author'
  }.js`;
  assert.equal(entries.has(matchingEntry), true);
  assert.equal(entries.has('/dist/src/preload.js'), true);
  assert.equal(entries.has('/dist/release/contract.js'), true);
  assert.equal(entries.has(siblingEntry), false);
  assert.equal(
    [...entries].some(
      (entry) =>
        entry.includes('/renderer/') ||
        entry.endsWith('/author.html') ||
        entry.endsWith('/assessment.html'),
    ),
    false,
  );
}

export async function assertPackagedRuntime(
  packaged: PackagedApplication,
  version: ReleaseVersion,
  input: PackagedDesktopLaunchInput,
): Promise<string> {
  assert.equal(input.executablePath, packaged.executablePath);
  const openedPath = join(input.homeDirectory, 'opened.json');
  const openedText = `{"target":"${packaged.app.kind}","label":"Grüße"}`;
  const savedPath = join(input.homeDirectory, 'saved.json');
  const savedText = `{"saved":"${packaged.app.kind}-✓"}`;
  await writeFile(openedPath, openedText, 'utf8');

  let launch: DesktopLaunch | undefined;
  try {
    launch = await launchPackagedDesktop(input);
    assert.equal(
      launch.userDataPath,
      join(launch.appDataPath, packaged.app.applicationId),
    );
    assert.equal(
      await launch.application.evaluate(({ app }) => app.getName()),
      packaged.app.productName,
    );
    assert.equal(
      await launch.application.evaluate(({ app }) => app.getVersion()),
      version,
    );
    assert.equal(launch.application.windows().length, 1);
    assert.equal(launch.page.url(), packaged.app.startUrl);
    assert.equal(await launch.page.title(), documentTitle(packaged.app));
    const heading = launch.page.getByRole('heading', {
      name: emptyHeading(packaged.app),
    });
    await heading.waitFor({ state: 'visible' });
    assert.equal(await heading.isVisible(), true);

    assert.deepEqual(
      await launch.page.evaluate(() => {
        const bridge = window.csfDesktop;
        return {
          require: 'require' in globalThis,
          electron: 'electron' in globalThis,
          ipcRenderer: 'ipcRenderer' in globalThis,
          bridge:
            bridge === undefined
              ? null
              : {
                  keys: Object.keys(bridge).sort(),
                  openType: typeof bridge.openJsonFile,
                  saveType: typeof bridge.saveJsonFile,
                  frozen: Object.isFrozen(bridge),
                },
        };
      }),
      {
        require: false,
        electron: false,
        ipcRenderer: false,
        bridge: {
          keys: ['openJsonFile', 'saveJsonFile'],
          openType: 'function',
          saveType: 'function',
          frozen: true,
        },
      },
    );

    const application = launch.application;
    const page = launch.page;
    const opened = await withOpenDialogResult(
      application,
      { canceled: false, filePaths: [openedPath] },
      () =>
        page.evaluate(async () => {
          const bridge = window.csfDesktop;
          if (bridge === undefined) {
            throw new Error('Desktop bridge is missing');
          }
          return bridge.openJsonFile();
        }),
    );
    assert.deepEqual(opened, { name: basename(openedPath), text: openedText });
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

    const webPreferences = await launch.application.evaluate(
      ({ BrowserWindow }) => {
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
          allowRunningInsecureContent: preferences.allowRunningInsecureContent,
          webviewTag: preferences.webviewTag,
          preload: preferences.preload ?? null,
        };
      },
    );
    assert.deepEqual(webPreferences, {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      preload: null,
    });

    await assert.rejects(
      launch.page.evaluate(() =>
        fetch('https://example.invalid/desktop-package-fetch'),
      ),
    );
    return launch.userDataPath;
  } finally {
    if (launch !== undefined) {
      await closeDesktop(launch);
    }
    await rm(input.homeDirectory, { recursive: true, force: true });
  }
}

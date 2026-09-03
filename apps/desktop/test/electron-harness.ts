import { fileURLToPath } from 'node:url';

import type {
  BrowserWindow as ElectronBrowserWindow,
  OpenDialogOptions,
  SaveDialogOptions,
} from 'electron';
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from 'playwright';

import { ASSESSMENT_TARGET, AUTHOR_TARGET } from '../src/target.js';
import type { DesktopTarget } from '../src/target.js';

export type DesktopSmokeTarget = {
  entry: DesktopTarget['kind'];
  target: DesktopTarget;
  documentTitle: string;
  emptyHeading: string;
};

export type DesktopLaunch = {
  application: ElectronApplication;
  page: Page;
  appDataPath: string;
  userDataPath: string;
};

export type PackagedDesktopLaunchInput = {
  executablePath: string;
  homeDirectory: string;
  arguments: readonly string[];
  environment: Readonly<Record<string, string>>;
};

export const DESKTOP_SMOKE_TARGETS: readonly DesktopSmokeTarget[] = [
  {
    entry: AUTHOR_TARGET.kind,
    target: AUTHOR_TARGET,
    documentTitle: 'Cloud Sovereignty Self-Assessment — Author',
    emptyHeading: 'No workbook',
  },
  {
    entry: ASSESSMENT_TARGET.kind,
    target: ASSESSMENT_TARGET,
    documentTitle: 'Cloud Sovereignty Self-Assessment',
    emptyHeading: 'Nothing loaded',
  },
];

const DESKTOP_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));

async function completeDesktopLaunch(
  application: ElectronApplication,
): Promise<DesktopLaunch> {
  try {
    const page = await application.firstWindow();
    const paths = await application.evaluate(({ app }) => ({
      appDataPath: app.getPath('appData'),
      userDataPath: app.getPath('userData'),
    }));

    return { application, page, ...paths };
  } catch (error) {
    await application.close();
    throw error;
  }
}

export async function launchDesktop(
  target: DesktopSmokeTarget,
  homeDirectory: string,
): Promise<DesktopLaunch> {
  const application = await electron.launch({
    args: [`dist/src/${target.entry}.js`],
    cwd: DESKTOP_DIRECTORY,
    env: {
      ...process.env,
      HOME: homeDirectory,
      CFFIXED_USER_HOME: homeDirectory,
      XDG_CONFIG_HOME: homeDirectory,
    },
  });

  return completeDesktopLaunch(application);
}

export async function launchPackagedDesktop(
  input: PackagedDesktopLaunchInput,
): Promise<DesktopLaunch> {
  const application = await electron.launch({
    executablePath: input.executablePath,
    args: [...input.arguments],
    env: {
      ...process.env,
      ...input.environment,
      HOME: input.homeDirectory,
      CFFIXED_USER_HOME: input.homeDirectory,
      XDG_CONFIG_HOME: input.homeDirectory,
    },
  });

  return completeDesktopLaunch(application);
}

export async function closeDesktop(launch: DesktopLaunch): Promise<void> {
  await launch.application.close();
}

export async function withOpenDialogResult<T>(
  application: ElectronApplication,
  result: { canceled: boolean; filePaths: string[] },
  run: () => Promise<T>,
): Promise<T> {
  await application.evaluate(({ BrowserWindow, dialog }, fakeResult) => {
    const [ownerWindow] = BrowserWindow.getAllWindows();
    if (ownerWindow === undefined) {
      throw new Error('Expected one desktop window');
    }
    if (!Reflect.set(dialog, '__csfOriginalShowOpenDialog', dialog.showOpenDialog)) {
      throw new Error('Could not save open dialog method');
    }
    if (
      !Reflect.set(
        dialog,
        'showOpenDialog',
        async (
          invokedWindow: ElectronBrowserWindow,
          options: OpenDialogOptions,
        ) => {
          if (invokedWindow.id !== ownerWindow.id) {
            throw new Error('Open dialog used the wrong owner window');
          }
          if (
            options.properties?.length !== 1 ||
            options.properties[0] !== 'openFile' ||
            options.filters?.length !== 1 ||
            options.filters[0]?.name !== 'JSON' ||
            options.filters[0]?.extensions.length !== 1 ||
            options.filters[0]?.extensions[0] !== 'json'
          ) {
            throw new Error('Open dialog options were not JSON-only');
          }
          return fakeResult;
        },
      )
    ) {
      throw new Error('Could not install open dialog method');
    }
  }, result);

  try {
    return await run();
  } finally {
    await application.evaluate(({ dialog }) => {
      const original = Reflect.get(dialog, '__csfOriginalShowOpenDialog');
      if (typeof original !== 'function') {
        throw new Error('Open dialog method was not saved');
      }
      Reflect.set(dialog, 'showOpenDialog', original);
      Reflect.deleteProperty(dialog, '__csfOriginalShowOpenDialog');
    });
  }
}

export async function withSaveDialogResult<T>(
  application: ElectronApplication,
  result: { canceled: boolean; filePath: string; suggestedName: string },
  run: () => Promise<T>,
): Promise<T> {
  await application.evaluate(({ BrowserWindow, dialog }, fakeResult) => {
    const [ownerWindow] = BrowserWindow.getAllWindows();
    if (ownerWindow === undefined) {
      throw new Error('Expected one desktop window');
    }
    if (!Reflect.set(dialog, '__csfOriginalShowSaveDialog', dialog.showSaveDialog)) {
      throw new Error('Could not save save dialog method');
    }
    if (
      !Reflect.set(
        dialog,
        'showSaveDialog',
        async (
          invokedWindow: ElectronBrowserWindow,
          options: SaveDialogOptions,
        ) => {
          if (invokedWindow.id !== ownerWindow.id) {
            throw new Error('Save dialog used the wrong owner window');
          }
          if (
            options.defaultPath !== fakeResult.suggestedName ||
            options.filters?.length !== 1 ||
            options.filters[0]?.name !== 'JSON' ||
            options.filters[0]?.extensions.length !== 1 ||
            options.filters[0]?.extensions[0] !== 'json'
          ) {
            throw new Error('Save dialog options were not JSON-only');
          }
          return {
            canceled: fakeResult.canceled,
            filePath: fakeResult.filePath,
          };
        },
      )
    ) {
      throw new Error('Could not install save dialog method');
    }
  }, result);

  try {
    return await run();
  } finally {
    await application.evaluate(({ dialog }) => {
      const original = Reflect.get(dialog, '__csfOriginalShowSaveDialog');
      if (typeof original !== 'function') {
        throw new Error('Save dialog method was not saved');
      }
      Reflect.set(dialog, 'showSaveDialog', original);
      Reflect.deleteProperty(dialog, '__csfOriginalShowSaveDialog');
    });
  }
}

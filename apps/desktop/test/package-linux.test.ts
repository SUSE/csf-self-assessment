import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  access,
  mkdtemp,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
  packageAssetName,
  readRootReleaseVersion,
} from '../release/contract.js';
import type {
  DesktopApplication,
  PackageTarget,
} from '../release/contract.js';
import {
  assertPackagedComposition,
  assertPackagedRuntime,
} from './package-harness.js';
import type { PackagedApplication } from './package-harness.js';

const execFileAsync = promisify(execFile);
const REPOSITORY_DIRECTORY = fileURLToPath(new URL('../../../', import.meta.url));
const VERSION = readRootReleaseVersion(
  new URL('../../../package.json', import.meta.url),
);
const APPIMAGE_TARGET: PackageTarget = {
  system: 'linux',
  cpu: 'x64',
  format: 'appimage',
  extension: 'AppImage',
};
const DEB_TARGET: PackageTarget = {
  system: 'linux',
  cpu: 'x64',
  format: 'deb',
  extension: 'deb',
};
const RPM_TARGET: PackageTarget = {
  system: 'linux',
  cpu: 'x64',
  format: 'rpm',
  extension: 'rpm',
};
const LEAP_IMAGE =
  'opensuse/leap:15.6@sha256:ca2942f9510c3e30fd322017782cdf6c067b2183dd7d56b39d0c697a9808ce2a';

function requireDisplay(): string {
  const display = process.env.DISPLAY;
  if (display === undefined || display.length === 0) {
    throw new Error('Linux package tests require Xvfb DISPLAY');
  }
  return display;
}

function sourceRendererPath(app: DesktopApplication): string {
  return join(
    REPOSITORY_DIRECTORY,
    `apps/${app.rendererDirectory}/dist/${app.rendererFile}`,
  );
}

function packagedApplication(
  app: DesktopApplication,
  executablePath: string,
  resourcesDirectory: string,
): PackagedApplication {
  return {
    app,
    executablePath,
    resourcesDirectory,
    sourceRendererPath: sourceRendererPath(app),
    packagedRendererPath: join(
      resourcesDirectory,
      `renderer/${app.rendererFile}`,
    ),
    absentRendererPath: join(
      resourcesDirectory,
      'renderer',
      app.kind === 'author' ? 'assessment.html' : 'author.html',
    ),
  };
}

function normalizeNativeVersion(version: string): string {
  return version.replaceAll('_', '-').replaceAll('~', '-');
}

async function assertInstalledIcon(
  app: DesktopApplication,
  iconPath: string,
): Promise<void> {
  assert.deepEqual(
    await readFile(iconPath),
    await readFile(
      join(
        REPOSITORY_DIRECTORY,
        `apps/desktop/release/icons/generated/${app.kind}/icon-512.png`,
      ),
    ),
  );
}

async function assertAppImage(
  app: DesktopApplication,
  appImagePath: string,
  display: string,
): Promise<void> {
  const extractionRoot = await mkdtemp(
    join(tmpdir(), `csf-desktop-appimage-${app.kind}-`),
  );
  try {
    await execFileAsync(appImagePath, ['--appimage-extract'], {
      cwd: extractionRoot,
      env: { ...process.env, APPIMAGE_EXTRACT_AND_RUN: '1' },
    });
    const squashfsRoot = join(extractionRoot, 'squashfs-root');
    const packaged = packagedApplication(
      app,
      appImagePath,
      join(squashfsRoot, 'resources'),
    );
    await assertPackagedComposition(packaged, VERSION);
    await assertInstalledIcon(
      app,
      join(
        squashfsRoot,
        `usr/share/icons/hicolor/512x512/apps/${app.packageName}.png`,
      ),
    );
    await assertPackagedRuntime(packaged, VERSION, {
      executablePath: appImagePath,
      homeDirectory: await mkdtemp(
        join(tmpdir(), `csf-desktop-appimage-runtime-${app.kind}-`),
      ),
      arguments: [],
      environment: { APPIMAGE_EXTRACT_AND_RUN: '1', DISPLAY: display },
    });
  } finally {
    await rm(extractionRoot, { recursive: true, force: true });
  }
}

async function debField(file: string, field: string): Promise<string> {
  const result = await execFileAsync('dpkg-deb', ['--field', file, field]);
  return result.stdout.trim();
}

async function assertDeb(
  app: DesktopApplication,
  debPath: string,
  display: string,
): Promise<void> {
  assert.equal(await debField(debPath, 'Package'), app.packageName);
  assert.equal(
    normalizeNativeVersion(await debField(debPath, 'Version')),
    VERSION,
  );
  assert.equal(await debField(debPath, 'Maintainer'), 'CSF Self Assessment');
  assert.deepEqual(
    (await debField(debPath, 'Description'))
      .split(/\r?\n/)
      .map((line) => line.trim()),
    [app.description, app.description],
  );
  const contents = await execFileAsync('dpkg-deb', ['--contents', debPath]);
  assert.equal(
    contents.stdout.includes(`/applications/${app.applicationId}.desktop`),
    true,
  );
  assert.equal(
    contents.stdout.includes(
      `/icons/hicolor/512x512/apps/${app.packageName}.png`,
    ),
    true,
  );
  const inspectionRoot = await mkdtemp(
    join(tmpdir(), `csf-desktop-deb-inspect-${app.kind}-`),
  );
  try {
    await execFileAsync('dpkg-deb', ['--extract', debPath, inspectionRoot]);
    const desktopEntry = await readFile(
      join(
        inspectionRoot,
        `usr/share/applications/${app.applicationId}.desktop`,
      ),
      'utf8',
    );
    assert.equal(desktopEntry.includes(`Name=${app.productName}`), true);
    assert.match(
      desktopEntry,
      new RegExp(`^Exec=.*\\/${app.packageName}"? %U$`, 'm'),
    );
    assert.equal(desktopEntry.includes(app.applicationId), true);
    assert.equal(desktopEntry.includes(`Icon=${app.packageName}`), true);
  } finally {
    await rm(inspectionRoot, { recursive: true, force: true });
  }

  await execFileAsync('sudo', [
    'apt-get',
    'install',
    '--yes',
    '--no-install-recommends',
    debPath,
  ]);
  try {
    const command = await execFileAsync('which', [app.packageName]);
    const executablePath = command.stdout.trim();
    const realExecutable = await execFileAsync('realpath', [executablePath]);
    const resourcesDirectory = join(
      dirname(realExecutable.stdout.trim()),
      'resources',
    );
    const packaged = packagedApplication(
      app,
      executablePath,
      resourcesDirectory,
    );
    await assertPackagedComposition(packaged, VERSION);
    await assertInstalledIcon(
      app,
      `/usr/share/icons/hicolor/512x512/apps/${app.packageName}.png`,
    );
    await assertPackagedRuntime(packaged, VERSION, {
      executablePath,
      homeDirectory: await mkdtemp(
        join(tmpdir(), `csf-desktop-deb-runtime-${app.kind}-`),
      ),
      arguments: [],
      environment: { DISPLAY: display },
    });
  } finally {
    await execFileAsync('sudo', ['dpkg', '--remove', app.packageName]);
  }
}

test(
  'Linux AppImage, DEB, and pinned Leap RPM proofs cover both apps',
  { skip: process.platform !== 'linux' },
  async () => {
    const display = requireDisplay();
    const paths = new Map<string, string>();
    for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
      for (const target of [APPIMAGE_TARGET, DEB_TARGET, RPM_TARGET]) {
        const file = packageAssetName(app.kind, target, VERSION);
        const path = join(
          REPOSITORY_DIRECTORY,
          `dist/desktop/${app.kind}`,
          file,
        );
        await access(path);
        paths.set(`${app.kind}:${target.format}`, path);
      }
    }
    assert.equal(paths.size, 6);

    for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
      const appImagePath = paths.get(`${app.kind}:appimage`);
      const debPath = paths.get(`${app.kind}:deb`);
      if (appImagePath === undefined || debPath === undefined) {
        throw new Error(`Missing Linux package path for ${app.kind}`);
      }
      await assertAppImage(app, appImagePath, display);
      await assertDeb(app, debPath, display);
    }

    const authorRpm = paths.get('author:rpm');
    const assessmentRpm = paths.get('assessment:rpm');
    if (authorRpm === undefined || assessmentRpm === undefined) {
      throw new Error('Missing RPM package paths');
    }
    await execFileAsync('docker', [
      'run',
      '--rm',
      '--platform',
      'linux/amd64',
      '--volume',
      `${join(REPOSITORY_DIRECTORY, 'dist/desktop')}:/packages:ro`,
      '--volume',
      `${join(REPOSITORY_DIRECTORY, 'apps/desktop/release/rpm-smoke.sh')}:/rpm-smoke.sh:ro`,
      LEAP_IMAGE,
      'bash',
      '/rpm-smoke.sh',
      VERSION,
      `/packages/author/${packageAssetName('author', RPM_TARGET, VERSION)}`,
      `/packages/assessment/${packageAssetName('assessment', RPM_TARGET, VERSION)}`,
    ]);
  },
);

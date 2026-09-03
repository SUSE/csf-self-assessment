import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
  packageAssetName,
  readPackageTrust,
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
const TRUST = readPackageTrust(process.env);
const DMG_TARGET: PackageTarget = {
  system: 'macos',
  cpu: 'universal',
  format: 'dmg',
  extension: 'dmg',
};
const ZIP_TARGET: PackageTarget = {
  system: 'macos',
  cpu: 'universal',
  format: 'zip',
  extension: 'zip',
};

function packagedApplication(
  app: DesktopApplication,
  appPath: string,
): PackagedApplication {
  const resourcesDirectory = join(appPath, 'Contents/Resources');
  return {
    app,
    executablePath: join(appPath, `Contents/MacOS/${app.productName}`),
    resourcesDirectory,
    sourceRendererPath: join(
      REPOSITORY_DIRECTORY,
      `apps/${app.rendererDirectory}/dist/${app.rendererFile}`,
    ),
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

function mountPointFrom(output: string): string {
  const line = output
    .trim()
    .split('\n')
    .find((entry) => entry.includes('/Volumes/'));
  if (line === undefined) {
    throw new Error('DMG attach output did not contain a mount point');
  }
  const columns = line.split('\t').filter((column) => column.length > 0);
  const mountPoint = columns.at(-1);
  if (mountPoint === undefined || !mountPoint.startsWith('/Volumes/')) {
    throw new Error('DMG attach output contained an invalid mount point');
  }
  return mountPoint;
}

async function assertAppleTrust(appPath: string): Promise<void> {
  await execFileAsync('/usr/bin/codesign', [
    '--verify',
    '--deep',
    '--strict',
    appPath,
  ]);
  const signature = await execFileAsync('/usr/bin/codesign', [
    '--display',
    '--verbose=4',
    appPath,
  ]);
  const signatureOutput = `${signature.stdout}${signature.stderr}`;
  assert.match(signatureOutput, /^Authority=Developer ID Application: /m);
  assert.match(signatureOutput, /flags=0x[0-9a-f]+\([^)]*runtime[^)]*\)/);

  const assessment = await execFileAsync('/usr/sbin/spctl', [
    '--assess',
    '--type',
    'execute',
    '--verbose=4',
    appPath,
  ]);
  const assessmentOutput = `${assessment.stdout}${assessment.stderr}`;
  assert.match(assessmentOutput, /accepted/);
  assert.match(assessmentOutput, /source=Notarized Developer ID/);

  await execFileAsync('/usr/bin/xcrun', ['stapler', 'validate', appPath]);
}

async function assertUniversalApplication(
  packaged: PackagedApplication,
  appPath: string,
  infoPlistPath: string,
): Promise<void> {
  await Promise.all([
    access(appPath),
    access(packaged.executablePath),
    access(infoPlistPath),
  ]);
  const architecture = await execFileAsync('/usr/bin/lipo', [
    '-archs',
    packaged.executablePath,
  ]);
  assert.deepEqual(architecture.stdout.trim().split(/\s+/).sort(), [
    'arm64',
    'x86_64',
  ]);
  if (TRUST === 'signed-candidate') {
    await assertAppleTrust(appPath);
  } else {
    await assert.rejects(
      execFileAsync('/usr/bin/codesign', ['--verify', appPath]),
    );
  }

  for (const [key, expected] of [
    ['CFBundleIdentifier', packaged.app.applicationId],
    ['CFBundleShortVersionString', VERSION],
    ['CFBundleIconFile', 'icon.icns'],
  ]) {
    const value = await execFileAsync('/usr/libexec/PlistBuddy', [
      '-c',
      `Print :${key}`,
      infoPlistPath,
    ]);
    assert.equal(value.stdout.trim(), expected);
  }

  await assertPackagedComposition(packaged, VERSION);
  await assertPackagedRuntime(packaged, VERSION, {
    executablePath: packaged.executablePath,
    homeDirectory: await mkdtemp(
      join(tmpdir(), `csf-desktop-macos-${packaged.app.kind}-`),
    ),
    arguments: [],
    environment: {},
  });
}

for (const app of [AUTHOR_TARGET, ASSESSMENT_TARGET]) {
  test(`${app.productName} universal DMG and ZIP contain the same exact app`, async () => {
    const outputDirectory = join(
      REPOSITORY_DIRECTORY,
      `dist/desktop/${app.kind}`,
    );
    const dmgPath = join(
      outputDirectory,
      packageAssetName(app.kind, DMG_TARGET, VERSION),
    );
    const zipPath = join(
      outputDirectory,
      packageAssetName(app.kind, ZIP_TARGET, VERSION),
    );
    await Promise.all([access(dmgPath), access(zipPath)]);

    const extractionDirectory = await mkdtemp(
      join(tmpdir(), `csf-desktop-macos-zip-${app.kind}-`),
    );
    let mountPoint: string | undefined;
    try {
      const attached = await execFileAsync('/usr/bin/hdiutil', [
        'attach',
        '-readonly',
        '-nobrowse',
        dmgPath,
      ]);
      mountPoint = mountPointFrom(attached.stdout);
      const dmgAppPath = join(mountPoint, `${app.productName}.app`);
      await assertUniversalApplication(
        packagedApplication(app, dmgAppPath),
        dmgAppPath,
        join(dmgAppPath, 'Contents/Info.plist'),
      );

      await execFileAsync('/usr/bin/ditto', ['-x', '-k', zipPath, extractionDirectory]);
      const zipAppPath = join(extractionDirectory, `${app.productName}.app`);
      await assertUniversalApplication(
        packagedApplication(app, zipAppPath),
        zipAppPath,
        join(zipAppPath, 'Contents/Info.plist'),
      );
    } finally {
      if (mountPoint !== undefined) {
        await execFileAsync('/usr/bin/hdiutil', ['detach', mountPoint]);
      }
      await rm(extractionDirectory, { recursive: true, force: true });
    }
  });
}

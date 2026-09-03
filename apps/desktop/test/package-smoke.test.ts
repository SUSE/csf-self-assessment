import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ASSESSMENT_TARGET,
  AUTHOR_TARGET,
  readRootReleaseVersion,
} from '../release/contract.js';
import type { DesktopApplication } from '../release/contract.js';
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

type Arm64Package = {
  appPath: string;
  infoPlistPath: string;
  packaged: PackagedApplication;
};

function arm64Package(app: DesktopApplication): Arm64Package {
  const appPath = join(
    REPOSITORY_DIRECTORY,
    `dist/desktop/${app.kind}/mac-arm64/${app.productName}.app`,
  );
  const resourcesDirectory = join(appPath, 'Contents/Resources');
  return {
    appPath,
    infoPlistPath: join(appPath, 'Contents/Info.plist'),
    packaged: {
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
    },
  };
}

for (const target of [
  arm64Package(AUTHOR_TARGET),
  arm64Package(ASSESSMENT_TARGET),
]) {
  test(`${target.packaged.app.productName} ARM64 package is exact, unsigned, and locked down`, async () => {
    await Promise.all([
      access(target.appPath),
      access(target.packaged.executablePath),
      access(target.infoPlistPath),
    ]);

    const architecture = await execFileAsync('/usr/bin/lipo', [
      '-archs',
      target.packaged.executablePath,
    ]);
    assert.equal(architecture.stdout.trim(), 'arm64');

    const bundleIdentifier = await execFileAsync('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleIdentifier',
      target.infoPlistPath,
    ]);
    assert.equal(
      bundleIdentifier.stdout.trim(),
      target.packaged.app.applicationId,
    );
    const bundleVersion = await execFileAsync('/usr/libexec/PlistBuddy', [
      '-c',
      'Print :CFBundleShortVersionString',
      target.infoPlistPath,
    ]);
    assert.equal(bundleVersion.stdout.trim(), VERSION);
    await assert.rejects(
      execFileAsync('/usr/bin/codesign', ['--verify', target.appPath]),
    );

    await assertPackagedComposition(target.packaged, VERSION);
    await assertPackagedRuntime(target.packaged, VERSION, {
      executablePath: target.packaged.executablePath,
      homeDirectory: await mkdtemp(
        join(tmpdir(), `csf-desktop-package-${target.packaged.app.kind}-`),
      ),
      arguments: [],
      environment: {},
    });
  });
}

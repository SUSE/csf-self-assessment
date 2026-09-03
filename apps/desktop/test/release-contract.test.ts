import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { assertReleaseFailure } from './release-assert.js';
import {
  SIGNING_SECRET_NAMES,
  CleanHostMatrixEntrySchema,
  ReleaseTagSchema,
  ReleaseVersionSchema,
  candidateTrustFor,
  cleanHostMatrix,
  decideRelease,
  nativeBuildMatrix,
  packageAssets,
  readPackageTrust,
  readRootReleaseVersion,
  releaseAssetNames,
  releaseTagFor,
  requiredSigningSecrets,
  requireReleaseTagForVersion,
} from '../release/contract.js';

const CANDIDATE_VERSION = ReleaseVersionSchema.parse('0.1.0-rc.1');
const CANDIDATE_TAG = ReleaseTagSchema.parse('v0.1.0-rc.1');
const OTHER_CANDIDATE_TAG = ReleaseTagSchema.parse('v0.1.0-rc.2');
const PREVIEW_VERSION = ReleaseVersionSchema.parse('0.1.0-rc.16');

test('the preview release owns four clean-host lanes', () => {
  const version = readRootReleaseVersion(
    new URL('../../../package.json', import.meta.url),
  );
  assert.equal(version, '0.1.0-rc.16');
  assert.equal(releaseTagFor(version), 'v0.1.0-rc.16');

  const matrix = cleanHostMatrix();
  assert.deepEqual(matrix, [
    { lane: 'macos-arm64', system: 'macos', runner: 'macos-26' },
    { lane: 'macos-x64', system: 'macos', runner: 'macos-26-intel' },
    { lane: 'windows-x64', system: 'windows', runner: 'windows-2025' },
    { lane: 'linux-x64', system: 'linux', runner: 'ubuntu-24.04' },
  ]);
  assert.equal(
    new Set(
      matrix
        .filter(({ system }) => system === 'macos')
        .map(({ runner }) => runner),
    ).size,
    2,
  );
  for (const entry of matrix) {
    assert.deepEqual(CleanHostMatrixEntrySchema.parse(entry), entry);
  }
});

test('the root candidate owns the release tag and complete asset set', () => {
  assert.equal(releaseTagFor(CANDIDATE_VERSION), 'v0.1.0-rc.1');
  assert.deepEqual(decideRelease(CANDIDATE_VERSION, 'false'), {
    kind: 'candidate',
    reason: 'prerelease-version',
  });
  assert.deepEqual(decideRelease(CANDIDATE_VERSION, 'true'), {
    kind: 'candidate',
    reason: 'prerelease-version',
  });

  const assets = packageAssets(CANDIDATE_VERSION);
  assert.equal(new Set(assets.map(({ format }) => format)).size, 6);
  assert.equal(assets.length, 12);
  const releaseNames = releaseAssetNames(CANDIDATE_VERSION);
  assert.equal(releaseNames.length, 17);
  assert.equal(new Set(releaseNames).size, 17);
});

test('the release contract owns package trust and its signing secret routes', async () => {
  assert.equal(candidateTrustFor('false'), 'unsigned-candidate');
  assert.equal(candidateTrustFor('true'), 'signed-candidate');

  assert.deepEqual(requiredSigningSecrets('linux', 'signed-candidate'), []);
  assert.deepEqual(requiredSigningSecrets('macos', 'unsigned-candidate'), []);
  assert.deepEqual(requiredSigningSecrets('windows', 'unsigned-candidate'), []);
  assert.deepEqual(requiredSigningSecrets('linux', 'unsigned-candidate'), []);

  const macosSecrets = [
    'MACOS_CSC_LINK',
    'MACOS_CSC_KEY_PASSWORD',
    'APPLE_API_KEY_P8',
    'APPLE_API_KEY_ID',
    'APPLE_API_ISSUER',
  ];
  const windowsSecrets = [
    'WINDOWS_CSC_LINK',
    'WINDOWS_CSC_KEY_PASSWORD',
  ];
  assert.deepEqual(
    requiredSigningSecrets('macos', 'signed-candidate'),
    macosSecrets,
  );
  assert.deepEqual(
    requiredSigningSecrets('windows', 'signed-candidate'),
    windowsSecrets,
  );
  assert.deepEqual(
    [...macosSecrets, ...windowsSecrets].sort(),
    [...SIGNING_SECRET_NAMES].sort(),
  );

  assert.equal(
    readPackageTrust({ CSF_DESKTOP_PACKAGE_TRUST: 'signed-candidate' }),
    'signed-candidate',
  );
  await assertReleaseFailure(
    () => {
      readPackageTrust({});
    },
    { kind: 'invalid-package-trust', value: '' },
  );
  await assertReleaseFailure(
    () => {
      readPackageTrust({ CSF_DESKTOP_PACKAGE_TRUST: 'signed' });
    },
    { kind: 'invalid-package-trust', value: 'signed' },
  );
});

test('stable example names match the desktop specification', () => {
  const stableVersion = ReleaseVersionSchema.parse('0.1.0');
  assert.deepEqual(
    packageAssets(stableVersion)
      .filter(({ app }) => app === 'author')
      .map(({ file }) => file),
    [
      'csf-author-0.1.0-macos-universal.dmg',
      'csf-author-0.1.0-macos-universal.zip',
      'csf-author-0.1.0-windows-x64.exe',
      'csf-author-0.1.0-linux-x64.AppImage',
      'csf-author-0.1.0-linux-x64.deb',
      'csf-author-0.1.0-linux-x64.rpm',
    ],
  );
  assert.deepEqual(
    packageAssets(stableVersion)
      .filter(({ app }) => app === 'assessment')
      .map(({ file }) => file),
    [
      'csf-assessment-0.1.0-macos-universal.dmg',
      'csf-assessment-0.1.0-macos-universal.zip',
      'csf-assessment-0.1.0-windows-x64.exe',
      'csf-assessment-0.1.0-linux-x64.AppImage',
      'csf-assessment-0.1.0-linux-x64.deb',
      'csf-assessment-0.1.0-linux-x64.rpm',
    ],
  );
});

test('root package versions are parsed at the file boundary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-release-version-'));
  const packageUrl = pathToFileURL(join(directory, 'package.json'));

  try {
    await writeFile(packageUrl, '{"version":"01.0.0"}\n', 'utf8');
    await assertReleaseFailure(
      () => {
        readRootReleaseVersion(packageUrl);
      },
      { kind: 'invalid-root-package', path: packageUrl.pathname },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the exact release tag is parsed and required once', async () => {
  assert.equal(
    requireReleaseTagForVersion(CANDIDATE_VERSION, 'v0.1.0-rc.1'),
    'v0.1.0-rc.1',
  );
  await assertReleaseFailure(
    () => {
      requireReleaseTagForVersion(CANDIDATE_VERSION, '0.1.0-rc.1');
    },
    { kind: 'invalid-tag', tag: '0.1.0-rc.1' },
  );
  await assertReleaseFailure(
    () => {
      requireReleaseTagForVersion(CANDIDATE_VERSION, 'v0.1.0-rc.2');
    },
    {
      kind: 'tag-version-mismatch',
      expected: CANDIDATE_TAG,
      actual: OTHER_CANDIDATE_TAG,
    },
  );
});

test('a prerelease version can never publish', () => {
  const candidate = {
    kind: 'candidate',
    reason: 'prerelease-version',
  };
  assert.deepEqual(decideRelease(PREVIEW_VERSION, 'true'), candidate);
  assert.deepEqual(decideRelease(PREVIEW_VERSION, 'false'), candidate);
  assert.deepEqual(
    decideRelease(ReleaseVersionSchema.parse('0.1.0'), 'true'),
    { kind: 'publishable' },
  );
});

test('only a ready stable version is publishable', () => {
  const stableVersion = ReleaseVersionSchema.parse('0.1.0');
  assert.deepEqual(decideRelease(stableVersion, 'false'), {
    kind: 'candidate',
    reason: 'signing-not-ready',
  });
  assert.deepEqual(decideRelease(stableVersion, 'true'), {
    kind: 'publishable',
  });
});

test('native builds use the settled runner matrix', () => {
  assert.deepEqual(nativeBuildMatrix(), [
    { system: 'macos', runner: 'macos-26' },
    { system: 'windows', runner: 'windows-2025' },
    { system: 'linux', runner: 'ubuntu-24.04' },
  ]);
});

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { assertReleaseFailure } from './release-assert.js';
import {
  CommitShaSchema,
  ReleaseTagSchema,
  ReleaseVersionSchema,
  Sha256Schema,
  packageAssets,
  releaseAssetNames,
} from '../release/contract.js';
import {
  assembleCandidate,
  stagePackageAssets,
  verifyCandidate,
} from '../release/evidence.js';

const VERSION = ReleaseVersionSchema.parse('0.1.0-rc.1');
const TAG = ReleaseTagSchema.parse('v0.1.0-rc.1');
const COMMIT = CommitShaSchema.parse('0123456789abcdef0123456789abcdef01234567');
const USER_DELIVERABLES = [
  'author.html',
  'assessment.html',
  ...packageAssets(VERSION).map(({ file }) => file),
];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function createInput(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const [index, name] of USER_DELIVERABLES.entries()) {
    await writeFile(join(directory, name), `fixture-${index}-${name}\n`, 'utf8');
  }
}

async function assembleFixture(root: string, label: string): Promise<string> {
  const inputDirectory = join(root, `${label}-input`);
  const outputDirectory = join(root, `${label}-candidate`);
  await createInput(inputDirectory);
  await assembleCandidate({
    inputDirectory,
    outputDirectory,
    version: VERSION,
    tag: TAG,
    commit: COMMIT,
    nodeVersion: '22.14.0',
  });
  return outputDirectory;
}

test('candidate assembly writes and verifies the exact evidence set', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-evidence-'));

  try {
    const outputDirectory = await assembleFixture(root, 'valid');
    const names = (await readdir(outputDirectory)).sort();
    assert.deepEqual(names, [...releaseAssetNames(VERSION)].sort());
    assert.equal(names.length, 17);

    const manifest = await verifyCandidate(outputDirectory);
    assert.equal(manifest.packages.length, 12);
    for (const renderer of [
      manifest.renderers.author,
      manifest.renderers.assessment,
    ]) {
      const bytes = await readFile(join(outputDirectory, renderer.file));
      assert.equal(renderer.bytes, bytes.length);
      assert.equal(renderer.sha256, sha256(bytes));
    }
    const sbomBytes = await readFile(join(outputDirectory, manifest.sbom.file));
    assert.equal(manifest.sbom.bytes, sbomBytes.length);
    assert.equal(manifest.sbom.sha256, sha256(sbomBytes));

    for (const row of manifest.packages) {
      const bytes = await readFile(join(outputDirectory, row.file));
      assert.equal(row.bytes, bytes.length);
      assert.equal(row.sha256, sha256(bytes));
    }

    const checksumNames = names.filter((name) => name !== 'SHA256SUMS');
    const expectedChecksums = (
      await Promise.all(
        checksumNames.map(async (name) => {
          const bytes = await readFile(join(outputDirectory, name));
          return `${sha256(bytes)}  ${name}\n`;
        }),
      )
    ).join('');
    assert.equal(
      await readFile(join(outputDirectory, 'SHA256SUMS'), 'utf8'),
      expectedChecksums,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('candidate verification rejects extra, missing, and changed assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-evidence-errors-'));

  try {
    const extraDirectory = await assembleFixture(root, 'extra');
    await writeFile(join(extraDirectory, 'extra.txt'), 'extra\n', 'utf8');
    await assertReleaseFailure(
      async () => {
        await verifyCandidate(extraDirectory);
      },
      { kind: 'unexpected-asset', file: 'extra.txt' },
    );

    const missingDirectory = await assembleFixture(root, 'missing');
    await unlink(join(missingDirectory, 'author.html'));
    await assertReleaseFailure(
      async () => {
        await verifyCandidate(missingDirectory);
      },
      { kind: 'missing-asset', file: 'author.html' },
    );

    const changedDirectory = await assembleFixture(root, 'changed');
    const beforeChange = await verifyCandidate(changedDirectory);
    const changedPath = join(changedDirectory, 'author.html');
    const changedBytes = await readFile(changedPath);
    changedBytes[0] = changedBytes[0] === 0 ? 1 : 0;
    await writeFile(changedPath, changedBytes);
    await assertReleaseFailure(
      async () => {
        await verifyCandidate(changedDirectory);
      },
      {
        kind: 'hash-mismatch',
        file: 'author.html',
        expected: beforeChange.renderers.author.sha256,
        actual: Sha256Schema.parse(sha256(changedBytes)),
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('native staging copies only contract-owned package assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-stage-'));
  const buildDirectory = join(root, 'build');
  const stageDirectory = join(root, 'stage');
  const macAssets = packageAssets(VERSION).filter(
    ({ system }) => system === 'macos',
  );

  try {
    await mkdir(buildDirectory, { recursive: true });
    for (const asset of macAssets) {
      const appDirectory = join(buildDirectory, asset.app);
      await mkdir(appDirectory, { recursive: true });
      await writeFile(join(appDirectory, asset.file), asset.file, 'utf8');
    }
    await writeFile(join(buildDirectory, 'builder-debug.yml'), 'ignored\n', 'utf8');
    const staged = await stagePackageAssets(
      'macos',
      VERSION,
      buildDirectory,
      stageDirectory,
    );
    assert.deepEqual([...staged].sort(), macAssets.map(({ file }) => file).sort());
    assert.deepEqual(
      (await readdir(stageDirectory)).sort(),
      macAssets.map(({ file }) => file).sort(),
    );

    const missingAsset = macAssets[0];
    assert.ok(missingAsset);
    await unlink(join(buildDirectory, missingAsset.app, missingAsset.file));
    await assert.rejects(
      stagePackageAssets(
        'macos',
        VERSION,
        buildDirectory,
        join(root, 'missing-stage'),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

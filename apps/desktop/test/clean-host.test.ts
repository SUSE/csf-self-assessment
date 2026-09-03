import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { assertReleaseFailure } from './release-assert.js';
import {
  CommitShaSchema,
  ReleaseManifestSchema,
  ReleaseTagSchema,
  ReleaseVersionSchema,
  Sha256Schema,
  packageAssets,
} from '../release/contract.js';
import type { CleanHostLane } from '../release/contract.js';
import {
  cleanHostSystem,
  planCleanHostTest,
  prepareCleanHostCandidate,
} from '../release/clean-host.js';
import { assembleCandidate } from '../release/evidence.js';

const RELEASE_DIRECTORY = fileURLToPath(new URL('../release/', import.meta.url));
const DESKTOP_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));
const VERSION = ReleaseVersionSchema.parse('0.1.0');
const TAG = ReleaseTagSchema.parse('v0.1.0');
const COMMIT = CommitShaSchema.parse('0123456789abcdef0123456789abcdef01234567');
const LANES: readonly CleanHostLane[] = [
  'macos-arm64',
  'macos-x64',
  'windows-x64',
  'linux-x64',
];
const RENDERERS: readonly {
  app: 'author' | 'assessment';
  file: 'author.html' | 'assessment.html';
}[] = [
  { app: 'author', file: 'author.html' },
  { app: 'assessment', file: 'assessment.html' },
];
const APPS: readonly ('author' | 'assessment')[] = ['author', 'assessment'];
const TEST_FILES: readonly [CleanHostLane, string][] = [
  ['macos-arm64', 'test/package-macos.test.ts'],
  ['macos-x64', 'test/package-macos.test.ts'],
  ['windows-x64', 'test/package-windows.test.ts'],
  ['linux-x64', 'test/package-linux.test.ts'],
];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function assembleFixture(root: string, label: string): Promise<string> {
  const inputDirectory = join(root, `${label}-input`);
  const outputDirectory = join(root, `${label}-candidate`);
  await mkdir(inputDirectory, { recursive: true });
  const names = [
    'author.html',
    'assessment.html',
    ...packageAssets(VERSION).map(({ file }) => file),
  ];
  for (const [index, name] of names.entries()) {
    await writeFile(join(inputDirectory, name), `fixture-${index}-${name}\n`, 'utf8');
  }
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

test('clean hosts receive only their verified candidate files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-clean-host-'));

  try {
    const candidateDirectory = await assembleFixture(root, 'valid');
    for (const lane of LANES) {
      const repositoryDirectory = join(root, `repository-${lane}`);
      const manifest = await prepareCleanHostCandidate({
        lane,
        candidateDirectory,
        repositoryDirectory,
      });
      assert.equal(manifest.version, VERSION);

      for (const { app, file } of RENDERERS) {
        assert.deepEqual(
          await readFile(join(repositoryDirectory, `apps/${app}/dist/${file}`)),
          await readFile(join(candidateDirectory, file)),
        );
      }

      const system = cleanHostSystem(lane);
      for (const app of APPS) {
        const expectedAssets = packageAssets(VERSION).filter(
          (asset) => asset.app === app && asset.system === system,
        );
        const outputDirectory = join(
          repositoryDirectory,
          `dist/desktop/${app}`,
        );
        assert.deepEqual(
          (await readdir(outputDirectory)).sort(),
          expectedAssets.map(({ file }) => file).sort(),
        );
        for (const asset of expectedAssets) {
          const outputPath = join(outputDirectory, asset.file);
          assert.deepEqual(
            await readFile(outputPath),
            await readFile(join(candidateDirectory, asset.file)),
          );
          if (asset.format === 'appimage') {
            assert.equal((await stat(outputPath)).mode & 0o111, 0o111);
          }
        }
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('clean-host preparation verifies every byte before creating destinations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-clean-host-hash-'));

  try {
    const candidateDirectory = await assembleFixture(root, 'changed');
    const manifest = ReleaseManifestSchema.parse(
      JSON.parse(
        await readFile(join(candidateDirectory, 'release-manifest.json'), 'utf8'),
      ),
    );
    const authorPath = join(candidateDirectory, 'author.html');
    const changedBytes = await readFile(authorPath);
    changedBytes[0] = changedBytes[0] === 0 ? 1 : 0;
    await writeFile(authorPath, changedBytes);
    const repositoryDirectory = join(root, 'repository');

    await assertReleaseFailure(
      async () => {
        await prepareCleanHostCandidate({
          lane: 'macos-arm64',
          candidateDirectory,
          repositoryDirectory,
        });
      },
      {
        kind: 'hash-mismatch',
        file: 'author.html',
        expected: Sha256Schema.parse(manifest.renderers.author.sha256),
        actual: Sha256Schema.parse(sha256(changedBytes)),
      },
    );
    await assert.rejects(
      access(join(repositoryDirectory, 'apps/author/dist/author.html')),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('clean-host package tests are planned for each native lane', () => {
  for (const [lane, file] of TEST_FILES) {
    assert.deepEqual(planCleanHostTest(lane), {
      kind: 'clean-host-test',
      lane,
      pnpmArguments: [
        'exec',
        'node',
        '--import',
        'tsx',
        '--test',
        '--test-concurrency=1',
        file,
      ],
    });
  }
});

test('clean-host CLI rejects missing and invalid lane or trust arguments', () => {
  const usage =
    'Usage: clean-host-cli.ts <macos-arm64|macos-x64|windows-x64|linux-x64> <unsigned-candidate|signed-candidate> <candidate-directory>\n';
  const cases: readonly (readonly string[])[] = [
    [],
    ['darwin-arm64', 'signed-candidate', 'candidate'],
    ['macos-arm64', 'local-proof', 'candidate'],
  ];

  for (const arguments_ of cases) {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', join(RELEASE_DIRECTORY, 'clean-host-cli.ts'), ...arguments_],
      { cwd: DESKTOP_DIRECTORY, encoding: 'utf8', env: process.env },
    );
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, usage);
    assert.doesNotMatch(result.stderr, / at /);
  }
});

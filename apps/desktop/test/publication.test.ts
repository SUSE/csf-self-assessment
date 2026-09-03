import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { assertReleaseFailure } from './release-assert.js';
import {
  CommitShaSchema,
  GitHubRepositorySchema,
  ReleaseError,
  ReleaseTagSchema,
  ReleaseVersionSchema,
  RemoteReleaseSchema,
  packageAssets,
  releaseAssetNames,
} from '../release/contract.js';
import type {
  GitHubReleaseOperation,
  ReleaseAssetEvidence,
  RemoteRelease,
} from '../release/contract.js';
import { assembleCandidate } from '../release/evidence.js';
import {
  createVerifiedDraft,
  publishVerifiedDraft,
  releaseAssetEvidence,
} from '../release/publication.js';
import type {
  GhArguments,
  GhCommandResult,
  GhRunner,
} from '../release/publication.js';

const VERSION = ReleaseVersionSchema.parse('0.1.0');
const TAG = ReleaseTagSchema.parse('v0.1.0');
const OTHER_TAG = ReleaseTagSchema.parse('v0.1.1');
const COMMIT = CommitShaSchema.parse('0123456789abcdef0123456789abcdef01234567');
const OTHER_COMMIT = CommitShaSchema.parse(
  '89abcdef0123456789abcdef0123456789abcdef',
);
const REPOSITORY = GitHubRepositorySchema.parse('ravan/csf-self-assessment-tools');
const PRIVATE_REPOSITORY = JSON.stringify({ visibility: 'PRIVATE' });

type ScriptedStep = {
  operation: GitHubReleaseOperation;
  arguments_: GhArguments;
  result: GhCommandResult;
};

type RecordedCall = {
  operation: GitHubReleaseOperation;
  arguments_: GhArguments;
};

function ghArguments(first: string, ...rest: string[]): GhArguments {
  return [first, ...rest];
}

function scriptedRunner(steps: readonly ScriptedStep[]): {
  run: GhRunner;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  return {
    calls,
    run: async (operation, arguments_) => {
      const step = steps[calls.length];
      if (step === undefined) {
        throw new Error(`Unexpected gh call: ${operation}`);
      }
      assert.equal(operation, step.operation);
      assert.deepEqual(arguments_, step.arguments_);
      calls.push({ operation, arguments_ });
      return step.result;
    },
  };
}

async function assembleFixture(root: string): Promise<string> {
  const inputDirectory = join(root, 'input');
  const outputDirectory = join(root, 'candidate');
  await mkdir(inputDirectory);
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

function remoteRelease(
  evidence: readonly ReleaseAssetEvidence[],
  draft: boolean,
  prerelease: boolean,
): RemoteRelease {
  return RemoteReleaseSchema.parse({
    tag_name: TAG,
    draft,
    prerelease,
    assets: [...evidence]
      .reverse()
      .map(({ file, bytes, sha256 }) => ({
        name: file,
        size: bytes,
        digest: `sha256:${sha256}`,
      })),
  });
}

function inspectArguments(): GhArguments {
  return ghArguments(
    'api',
    `repos/${REPOSITORY}/releases/tags/${TAG}`,
  );
}

function successfulResult(stdout: string): GhCommandResult {
  return { kind: 'succeeded', stdout };
}

function assertSafeCommands(calls: readonly RecordedCall[]): void {
  const arguments_ = calls.flatMap((call) => call.arguments_);
  assert.equal(arguments_.includes('--clobber'), false);
  assert.equal(arguments_.includes('delete'), false);
  assert.equal(
    arguments_.filter((argument) => argument.startsWith('v0.1.')).every(
      (argument) => argument === TAG,
    ),
    true,
  );
}

test('draft creation uploads and verifies the exact candidate once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-draft-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    const notesFile = join(root, 'notes.md');
    await writeFile(notesFile, 'Preview notes\n', 'utf8');
    const evidence = await releaseAssetEvidence(candidateDirectory);
    const remote = remoteRelease(evidence, true, true);
    const assetPaths = releaseAssetNames(VERSION).map((file) =>
      join(candidateDirectory, file),
    );
    const runner = scriptedRunner([
      {
        operation: 'inspect-repository',
        arguments_: ghArguments(
          'repo',
          'view',
          REPOSITORY,
          '--json',
          'visibility',
        ),
        result: successfulResult(PRIVATE_REPOSITORY),
      },
      {
        operation: 'create-draft',
        arguments_: ghArguments(
          'release',
          'create',
          TAG,
          '--repo',
          REPOSITORY,
          '--draft',
          '--prerelease',
          '--verify-tag',
          '--generate-notes',
          '--notes-file',
          notesFile,
        ),
        result: successfulResult(''),
      },
      {
        operation: 'upload-assets',
        arguments_: ghArguments(
          'release',
          'upload',
          TAG,
          ...assetPaths,
          '--repo',
          REPOSITORY,
        ),
        result: successfulResult(''),
      },
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult(JSON.stringify(remote)),
      },
    ]);

    assert.deepEqual(
      await createVerifiedDraft(
        {
          candidateDirectory,
          notesFile,
          repository: REPOSITORY,
          expectedTag: TAG,
          expectedCommit: COMMIT,
        },
        runner.run,
      ),
      remote,
    );
    assert.equal(runner.calls.length, 4);
    assertSafeCommands(runner.calls);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('publication verifies the draft before and after the exact edit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-publish-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    const evidence = await releaseAssetEvidence(candidateDirectory);
    const draft = remoteRelease(evidence, true, true);
    const published = remoteRelease(evidence, false, true);
    const runner = scriptedRunner([
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult(JSON.stringify(draft)),
      },
      {
        operation: 'publish-release',
        arguments_: ghArguments(
          'release',
          'edit',
          TAG,
          '--draft=false',
          '--prerelease',
          '--latest=false',
          '--repo',
          REPOSITORY,
        ),
        result: successfulResult(''),
      },
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult(JSON.stringify(published)),
      },
    ]);

    assert.deepEqual(
      await publishVerifiedDraft(
        {
          candidateDirectory,
          repository: REPOSITORY,
          expectedTag: TAG,
          expectedCommit: COMMIT,
        },
        runner.run,
      ),
      published,
    );
    assert.equal(runner.calls.length, 3);
    assertSafeCommands(runner.calls);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local release context mismatches stop before GitHub', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-context-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    for (const [expectedTag, expectedCommit, field] of [
      [OTHER_TAG, COMMIT, 'tag'],
      [TAG, OTHER_COMMIT, 'commit'],
    ] satisfies readonly (readonly [
      typeof TAG,
      typeof COMMIT,
      'tag' | 'commit',
    ])[]) {
      const runner = scriptedRunner([]);
      await assertReleaseFailure(
        async () => {
          await publishVerifiedDraft(
            {
              candidateDirectory,
              repository: REPOSITORY,
              expectedTag,
              expectedCommit,
            },
            runner.run,
          );
        },
        { kind: 'release-context-mismatch', field },
      );
      assert.equal(runner.calls.length, 0);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a public repository and an existing release stop draft creation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-private-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    const notesFile = join(root, 'notes.md');
    await writeFile(notesFile, 'Preview notes\n', 'utf8');
    const publicRunner = scriptedRunner([
      {
        operation: 'inspect-repository',
        arguments_: ghArguments(
          'repo',
          'view',
          REPOSITORY,
          '--json',
          'visibility',
        ),
        result: successfulResult(JSON.stringify({ visibility: 'PUBLIC' })),
      },
    ]);
    await assertReleaseFailure(
      async () => {
        await createVerifiedDraft(
          {
            candidateDirectory,
            notesFile,
            repository: REPOSITORY,
            expectedTag: TAG,
            expectedCommit: COMMIT,
          },
          publicRunner.run,
        );
      },
      { kind: 'repository-not-private', repository: REPOSITORY },
    );
    assert.equal(publicRunner.calls.length, 1);

    const existingRunner = scriptedRunner([
      {
        operation: 'inspect-repository',
        arguments_: ghArguments(
          'repo',
          'view',
          REPOSITORY,
          '--json',
          'visibility',
        ),
        result: successfulResult(PRIVATE_REPOSITORY),
      },
      {
        operation: 'create-draft',
        arguments_: ghArguments(
          'release',
          'create',
          TAG,
          '--repo',
          REPOSITORY,
          '--draft',
          '--prerelease',
          '--verify-tag',
          '--generate-notes',
          '--notes-file',
          notesFile,
        ),
        result: { kind: 'failed', exitCode: 17 },
      },
    ]);
    await assertReleaseFailure(
      async () => {
        await createVerifiedDraft(
          {
            candidateDirectory,
            notesFile,
            repository: REPOSITORY,
            expectedTag: TAG,
            expectedCommit: COMMIT,
          },
          existingRunner.run,
        );
      },
      {
        kind: 'github-command-failed',
        operation: 'create-draft',
        exitCode: 17,
      },
    );
    assert.equal(existingRunner.calls.length, 2);
    assertSafeCommands(existingRunner.calls);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('publication refuses every incomplete or changed remote draft', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-remote-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    const evidence = await releaseAssetEvidence(candidateDirectory);
    const valid = remoteRelease(evidence, true, true);
    const first = valid.assets[0];
    if (first === undefined) {
      throw new Error('Expected release evidence');
    }
    const cases: readonly RemoteRelease[] = [
      RemoteReleaseSchema.parse({ ...valid, assets: valid.assets.slice(1) }),
      RemoteReleaseSchema.parse({
        ...valid,
        assets: [
          ...valid.assets,
          { name: 'extra.bin', size: 1, digest: `sha256:${'0'.repeat(64)}` },
        ],
      }),
      RemoteReleaseSchema.parse({
        ...valid,
        assets: valid.assets.map((asset, index) =>
          index === 0 ? { ...asset, size: asset.size + 1 } : asset,
        ),
      }),
      RemoteReleaseSchema.parse({
        ...valid,
        assets: valid.assets.map((asset, index) =>
          index === 0
            ? { ...asset, digest: `sha256:${'0'.repeat(64)}` }
            : asset,
        ),
      }),
      RemoteReleaseSchema.parse({ ...valid, prerelease: false }),
      RemoteReleaseSchema.parse({ ...valid, draft: false }),
    ];

    for (const remote of cases) {
      const runner = scriptedRunner([
        {
          operation: 'inspect-release',
          arguments_: inspectArguments(),
          result: successfulResult(JSON.stringify(remote)),
        },
      ]);
      await assert.rejects(
        publishVerifiedDraft(
          {
            candidateDirectory,
            repository: REPOSITORY,
            expectedTag: TAG,
            expectedCommit: COMMIT,
          },
          runner.run,
        ),
        ReleaseError,
      );
      assert.equal(runner.calls.length, 1);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('publication refuses an invalid API shape and a draft after edit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'csf-publication-state-'));

  try {
    const candidateDirectory = await assembleFixture(root);
    const evidence = await releaseAssetEvidence(candidateDirectory);
    const draft = remoteRelease(evidence, true, true);
    const invalidRunner = scriptedRunner([
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult('{}'),
      },
    ]);
    await assertReleaseFailure(
      async () => {
        await publishVerifiedDraft(
          {
            candidateDirectory,
            repository: REPOSITORY,
            expectedTag: TAG,
            expectedCommit: COMMIT,
          },
          invalidRunner.run,
        );
      },
      { kind: 'invalid-remote-release', tag: TAG },
    );

    const finalDraftRunner = scriptedRunner([
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult(JSON.stringify(draft)),
      },
      {
        operation: 'publish-release',
        arguments_: ghArguments(
          'release',
          'edit',
          TAG,
          '--draft=false',
          '--prerelease',
          '--latest=false',
          '--repo',
          REPOSITORY,
        ),
        result: successfulResult(''),
      },
      {
        operation: 'inspect-release',
        arguments_: inspectArguments(),
        result: successfulResult(JSON.stringify(draft)),
      },
    ]);
    await assertReleaseFailure(
      async () => {
        await publishVerifiedDraft(
          {
            candidateDirectory,
            repository: REPOSITORY,
            expectedTag: TAG,
            expectedCommit: COMMIT,
          },
          finalDraftRunner.run,
        );
      },
      {
        kind: 'remote-release-state',
        expected: 'published',
        actual: 'draft',
      },
    );
    assert.equal(finalDraftRunner.calls.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

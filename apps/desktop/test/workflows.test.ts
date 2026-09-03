import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { createLinter } from 'actionlint';
import { parse } from 'yaml';
import { z } from 'zod';

import {
  SIGNING_SECRET_NAMES,
  requiredSigningSecrets,
} from '../release/contract.js';

const REPOSITORY_DIRECTORY = fileURLToPath(new URL('../../../', import.meta.url));
const WORKFLOW_DIRECTORY = join(REPOSITORY_DIRECTORY, '.github/workflows');
const CHECKOUT =
  'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE =
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020';
const UPLOAD_ARTIFACT =
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02';
const DOWNLOAD_ARTIFACT =
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093';
const ALLOWED_USES = [
  CHECKOUT,
  SETUP_NODE,
  UPLOAD_ARTIFACT,
  DOWNLOAD_ARTIFACT,
];

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const StepSchema = z
  .object({
    name: z.string().min(1),
    id: z.string().min(1).optional(),
    uses: z.string().min(1).optional(),
    run: z.string().min(1).optional(),
    if: z.string().min(1).optional(),
    with: z.record(ScalarSchema).optional(),
    env: z.record(z.string()).optional(),
  })
  .passthrough();
const JobSchema = z
  .object({
    name: z.string().min(1).optional(),
    'runs-on': z.string().min(1),
    needs: z.union([z.string(), z.array(z.string())]).optional(),
    if: z.string().min(1).optional(),
    outputs: z.record(z.string()).optional(),
    permissions: z
      .object({ contents: z.enum(['read', 'write']) })
      .strict()
      .optional(),
    strategy: z
      .object({ matrix: z.string().min(1) })
      .passthrough()
      .optional(),
    steps: z.array(StepSchema).min(1),
  })
  .passthrough();
const VerifyWorkflowSchema = z
  .object({
    name: z.string().min(1),
    on: z
      .object({
        pull_request: z.null(),
        push: z.object({ branches: z.tuple([z.literal('main')]) }).strict(),
      })
      .strict(),
    permissions: z.object({ contents: z.literal('read') }).strict(),
    jobs: z.object({ verify: JobSchema }).strict(),
  })
  .strict();
const ReleaseWorkflowSchema = z
  .object({
    name: z.string().min(1),
    on: z
      .object({
        push: z.object({ tags: z.tuple([z.literal('v*')]) }).strict(),
      })
      .strict(),
    permissions: z.object({ contents: z.literal('read') }).strict(),
    jobs: z
      .object({
        source: JobSchema,
        native: JobSchema,
        assemble: JobSchema,
        clean_native: JobSchema,
        clean_renderers: JobSchema,
        draft: JobSchema,
        publish: JobSchema,
      })
      .strict(),
  })
  .strict();

type WorkflowStep = z.infer<typeof StepSchema>;
type WorkflowJob = z.infer<typeof JobSchema>;

function stepsWithUses(job: WorkflowJob): readonly WorkflowStep[] {
  return job.steps.filter((step) => step.uses !== undefined);
}

function stepsWithRun(job: WorkflowJob): readonly WorkflowStep[] {
  return job.steps.filter((step) => step.run !== undefined);
}

function countRun(workflowSource: string, command: string): number {
  return workflowSource.split(command).length - 1;
}

function artifactDownload(job: WorkflowJob): WorkflowStep | undefined {
  return stepsWithUses(job).find(({ uses }) => uses === DOWNLOAD_ARTIFACT);
}

function publicationStep(job: WorkflowJob): WorkflowStep | undefined {
  return stepsWithRun(job).find(({ run }) =>
    run?.includes('release:publication'),
  );
}

test('both workflows parse through zod and pass actionlint', async () => {
  const linter = await createLinter();
  for (const file of ['verify.yml', 'desktop-release.yml']) {
    const path = join(WORKFLOW_DIRECTORY, file);
    const source = await readFile(path, 'utf8');
    if (file === 'verify.yml') {
      VerifyWorkflowSchema.parse(parse(source));
    } else {
      ReleaseWorkflowSchema.parse(parse(source));
    }
    const varsReferences = source.match(/vars\.[A-Za-z0-9_]+/g) ?? [];
    assert.deepEqual(
      varsReferences,
      file === 'verify.yml' ? [] : ['vars.DESKTOP_RELEASE_SIGNING_READY'],
    );
    assert.equal((source.match(/vars\./g) ?? []).length, varsReferences.length);

    const diagnostics = linter(source, path);
    const staleVarsDiagnostics = diagnostics.filter(
      (diagnostic) =>
        diagnostic.kind === 'expression' &&
        diagnostic.message.startsWith('undefined variable "vars"'),
    );
    assert.equal(staleVarsDiagnostics.length, varsReferences.length);
    const unexpected = diagnostics.filter((diagnostic) => {
      const staleRunner =
        diagnostic.kind === 'runner-label' &&
        (/label "ubuntu-24\.04"/.test(diagnostic.message) ||
          /label "macos-26-intel"/.test(diagnostic.message));
      const staleVarsContext = staleVarsDiagnostics.includes(diagnostic);
      return !staleRunner && !staleVarsContext;
    });
    assert.deepEqual(unexpected, []);
  }
});

test('the ordinary workflow runs only one pinned verification lane', async () => {
  const source = await readFile(join(WORKFLOW_DIRECTORY, 'verify.yml'), 'utf8');
  const workflow = VerifyWorkflowSchema.parse(parse(source));
  const job = workflow.jobs.verify;

  assert.equal(job['runs-on'], 'ubuntu-24.04');
  assert.deepEqual(
    stepsWithUses(job).map(({ uses }) => uses),
    [CHECKOUT, SETUP_NODE],
  );
  assert.equal(countRun(source, 'pnpm verify'), 1);
  assert.equal(countRun(source, 'pnpm install --frozen-lockfile'), 1);
  assert.equal(countRun(source, 'corepack enable'), 1);
  assert.ok(
    job.steps.findIndex(({ run }) => run === 'corepack enable') <
      job.steps.findIndex(({ uses }) => uses === SETUP_NODE),
  );
  assert.doesNotMatch(
    source,
    /desktop:package|electron-builder|upload-artifact|download-artifact|\$\{\{\s*(?:vars|secrets)\.|gh release|api\.github\.com/,
  );
});

test('the gate receives a readiness value when the variable is absent', async () => {
  const source = await readFile(
    join(WORKFLOW_DIRECTORY, 'desktop-release.yml'),
    'utf8',
  );
  const workflow = ReleaseWorkflowSchema.parse(parse(source));
  const gateStep = workflow.jobs.source.steps.find(({ id }) => id === 'gate');
  const readiness = gateStep?.env?.RELEASE_READINESS;

  assert.equal(
    readiness,
    "${{ vars.DESKTOP_RELEASE_SIGNING_READY || 'false' }}",
  );
  assert.match(readiness ?? '', /'false'/);
  assert.doesNotMatch(readiness ?? '', /'true'/);
});

test('every job installs pnpm before the Node cache step', async () => {
  const source = await readFile(
    join(WORKFLOW_DIRECTORY, 'desktop-release.yml'),
    'utf8',
  );
  const workflow = ReleaseWorkflowSchema.parse(parse(source));
  const jobs = Object.values(workflow.jobs);

  assert.equal(jobs.length, 7);
  for (const job of jobs) {
    const corepackIndex = job.steps.findIndex(
      ({ run }) => run === 'corepack enable',
    );
    const setupNodeIndex = job.steps.findIndex(({ uses }) => uses === SETUP_NODE);
    assert.ok(corepackIndex >= 0);
    assert.ok(setupNodeIndex >= 0);
    assert.ok(corepackIndex < setupNodeIndex);
  }
});

test('the tag workflow owns clean gates, hidden draft, and atomic publish', async () => {
  const source = await readFile(
    join(WORKFLOW_DIRECTORY, 'desktop-release.yml'),
    'utf8',
  );
  const workflow = ReleaseWorkflowSchema.parse(parse(source));
  const {
    source: sourceJob,
    native,
    assemble,
    clean_native: cleanNative,
    clean_renderers: cleanRenderers,
    draft,
    publish,
  } = workflow.jobs;

  assert.deepEqual(Object.keys(workflow.jobs), [
    'source',
    'native',
    'assemble',
    'clean_native',
    'clean_renderers',
    'draft',
    'publish',
  ]);
  for (const [name, job] of Object.entries(workflow.jobs)) {
    assert.deepEqual(
      job.permissions,
      name === 'draft' || name === 'publish'
        ? { contents: 'write' }
        : undefined,
    );
  }

  const actionSteps = Object.values(workflow.jobs).flatMap(stepsWithUses);
  assert.deepEqual(
    [...new Set(actionSteps.map(({ uses }) => uses))].sort(),
    [...ALLOWED_USES].sort(),
  );
  for (const step of actionSteps) {
    assert.ok(step.uses !== undefined);
    assert.ok(ALLOWED_USES.includes(step.uses));
  }

  const secretReferences =
    source.match(/\$\{\{\s*secrets\.[^}]+\}\}/g) ?? [];
  const secretNames = secretReferences.map((reference) => {
    const match = /^\$\{\{ secrets\.([A-Z0-9_]+) \}\}$/.exec(reference);
    assert.ok(match !== null);
    return match[1];
  });
  assert.deepEqual(secretNames.sort(), [...SIGNING_SECRET_NAMES].sort());
  assert.equal(secretReferences.length, 7);
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (name !== 'native') {
      assert.equal(
        job.steps.some((step) =>
          Object.values(step.env ?? {}).some((value) =>
            value.includes('secrets.'),
          ),
        ),
        false,
      );
    }
  }

  assert.equal(sourceJob['runs-on'], 'ubuntu-24.04');
  assert.equal(sourceJob.needs, undefined);
  assert.deepEqual(sourceJob.outputs, {
    version: '${{ steps.gate.outputs.version }}',
    disposition: '${{ steps.gate.outputs.disposition }}',
    trust: '${{ steps.gate.outputs.trust }}',
    native_matrix: '${{ steps.gate.outputs.native_matrix }}',
    clean_matrix: '${{ steps.gate.outputs.clean_matrix }}',
  });
  assert.equal(sourceJob.steps[0]?.uses, CHECKOUT);
  assert.equal(sourceJob.steps[0]?.with?.['fetch-depth'], 0);
  assert.ok(
    stepsWithRun(sourceJob).some(({ run }) =>
      run?.includes('git merge-base --is-ancestor "$GITHUB_SHA" origin/main'),
    ),
  );
  assert.equal(countRun(source, 'pnpm verify'), 1);
  const rendererUpload = stepsWithUses(sourceJob).find(
    ({ uses }) => uses === UPLOAD_ARTIFACT,
  );
  assert.equal(rendererUpload?.with?.path, 'dist/release-renderers');
  assert.equal(rendererUpload?.with?.['retention-days'], 14);

  assert.equal(native.needs, 'source');
  assert.equal(native.if, undefined);
  assert.equal(native['runs-on'], '${{ matrix.runner }}');
  assert.equal(
    native.strategy?.matrix,
    '${{ fromJSON(needs.source.outputs.native_matrix) }}',
  );
  const nativeRun =
    'pnpm --filter @csf/desktop run release:native "${{ matrix.system }}" "${{ needs.source.outputs.trust }}"';
  const linuxNativeRun = `xvfb-run --auto-servernum ${nativeRun}`;
  const unsignedBuild = native.steps.find(
    ({ if: condition }) =>
      condition ===
      "${{ needs.source.outputs.trust == 'unsigned-candidate' && matrix.system != 'linux' }}",
  );
  assert.ok(unsignedBuild !== undefined);
  assert.equal(unsignedBuild.env, undefined);
  const unsignedLinuxBuild = native.steps.find(
    ({ if: condition }) =>
      condition ===
      "${{ needs.source.outputs.trust == 'unsigned-candidate' && matrix.system == 'linux' }}",
  );
  assert.ok(unsignedLinuxBuild !== undefined);
  assert.equal(unsignedLinuxBuild.env, undefined);

  const signedMacBuild = native.steps.find(
    ({ if: condition }) =>
      condition ===
      "${{ needs.source.outputs.trust == 'signed-candidate' && matrix.system == 'macos' }}",
  );
  assert.ok(signedMacBuild !== undefined);
  const macSecrets = requiredSigningSecrets('macos', 'signed-candidate');
  assert.deepEqual(Object.keys(signedMacBuild.env ?? {}), [...macSecrets]);
  for (const name of macSecrets) {
    assert.equal(signedMacBuild.env?.[name], `\${{ secrets.${name} }}`);
  }

  const signedWindowsBuild = native.steps.find(
    ({ if: condition }) =>
      condition ===
      "${{ needs.source.outputs.trust == 'signed-candidate' && matrix.system == 'windows' }}",
  );
  assert.ok(signedWindowsBuild !== undefined);
  const windowsSecrets = requiredSigningSecrets('windows', 'signed-candidate');
  assert.deepEqual(Object.keys(signedWindowsBuild.env ?? {}), [
    ...windowsSecrets,
  ]);
  for (const name of windowsSecrets) {
    assert.equal(
      signedWindowsBuild.env?.[name],
      `\${{ secrets.${name} }}`,
    );
  }

  const signedLinuxBuild = native.steps.find(
    ({ if: condition }) =>
      condition ===
      "${{ needs.source.outputs.trust == 'signed-candidate' && matrix.system == 'linux' }}",
  );
  assert.ok(signedLinuxBuild !== undefined);
  assert.equal(signedLinuxBuild.env, undefined);
  for (const step of [unsignedBuild, signedMacBuild, signedWindowsBuild]) {
    assert.equal(step.run, nativeRun);
  }
  assert.equal(unsignedLinuxBuild.run, linuxNativeRun);
  assert.equal(signedLinuxBuild.run, linuxNativeRun);
  const restoreRenderers = native.steps.find(
    ({ name }) => name === 'Restore renderer build paths',
  );
  assert.equal(restoreRenderers?.shell, 'bash');

  assert.deepEqual(assemble.needs, ['source', 'native']);
  assert.equal(assemble.if, undefined);
  assert.equal(assemble['runs-on'], 'ubuntu-24.04');
  const assembleRun = assemble.steps.find(
    ({ name }) => name === 'Assemble and verify candidate',
  );
  assert.ok(
    assembleRun?.run?.includes(
      'release:assemble ../../dist/candidate-input ../../dist/desktop-candidate',
    ),
  );
  assert.equal(
    stepsWithUses(assemble).filter(({ uses }) => uses === DOWNLOAD_ARTIFACT)
      .length,
    4,
  );
  const candidateUpload = stepsWithUses(assemble).find(
    ({ uses }) => uses === UPLOAD_ARTIFACT,
  );
  assert.equal(
    candidateUpload?.with?.name,
    'desktop-candidate-${{ needs.source.outputs.version }}',
  );
  assert.equal(candidateUpload?.with?.path, 'dist/desktop-candidate');
  assert.equal(candidateUpload?.with?.['retention-days'], 14);

  assert.deepEqual(cleanNative.needs, ['source', 'assemble']);
  assert.equal(cleanNative['runs-on'], '${{ matrix.runner }}');
  assert.equal(
    cleanNative.strategy?.matrix,
    '${{ fromJSON(needs.source.outputs.clean_matrix) }}',
  );
  assert.equal(
    artifactDownload(cleanNative)?.with?.name,
    'desktop-candidate-${{ needs.source.outputs.version }}',
  );
  assert.equal(
    artifactDownload(cleanNative)?.with?.path,
    'dist/desktop-candidate',
  );
  const cleanHostRun = cleanNative.steps.find(
    ({ if: condition }) => condition === "${{ matrix.system != 'linux' }}",
  );
  const cleanHostCommand =
    'pnpm --filter @csf/desktop run release:clean-host "${{ matrix.lane }}" "${{ needs.source.outputs.trust }}" "../../dist/desktop-candidate"';
  assert.equal(cleanHostRun?.run, cleanHostCommand);
  const cleanLinuxRun = cleanNative.steps.find(
    ({ if: condition }) => condition === "${{ matrix.system == 'linux' }}",
  );
  assert.equal(
    cleanLinuxRun?.run,
    `xvfb-run --auto-servernum ${cleanHostCommand}`,
  );
  const cleanFailureUpload = stepsWithUses(cleanNative).find(
    ({ uses, if: condition }) =>
      uses === UPLOAD_ARTIFACT && condition === '${{ failure() }}',
  );
  assert.equal(
    cleanFailureUpload?.with?.path,
    'apps/desktop/dist/release-logs/clean-${{ matrix.lane }}.log',
  );
  assert.equal(
    stepsWithUses(cleanNative).filter(({ uses }) => uses === UPLOAD_ARTIFACT)
      .length,
    1,
  );

  assert.deepEqual(cleanRenderers.needs, ['source', 'assemble']);
  assert.equal(cleanRenderers['runs-on'], 'ubuntu-24.04');
  assert.equal(
    artifactDownload(cleanRenderers)?.with?.name,
    'desktop-candidate-${{ needs.source.outputs.version }}',
  );
  assert.ok(
    stepsWithRun(cleanRenderers).some(({ run }) =>
      run?.includes('release:verify ../../dist/desktop-candidate'),
    ),
  );
  const rendererRun = stepsWithRun(cleanRenderers).find(({ run }) =>
    run?.includes('release:clean-renderers'),
  );
  assert.deepEqual(rendererRun?.env, {
    CSF_RELEASE_CANDIDATE_DIRECTORY: '../../dist/desktop-candidate',
  });

  assert.deepEqual(draft.needs, [
    'source',
    'assemble',
    'clean_native',
    'clean_renderers',
  ]);
  assert.equal(
    draft.if,
    "${{ needs.source.outputs.disposition == 'publishable' }}",
  );
  assert.equal(
    artifactDownload(draft)?.with?.name,
    'desktop-candidate-${{ needs.source.outputs.version }}',
  );
  const draftPublication = publicationStep(draft);
  assert.deepEqual(draftPublication?.env, { GH_TOKEN: '${{ github.token }}' });
  assert.ok(draftPublication?.run?.includes(' draft '));
  assert.ok(draftPublication?.run?.includes('"${{ github.repository }}"'));
  assert.ok(draftPublication?.run?.includes('"${{ github.ref_name }}"'));
  assert.ok(draftPublication?.run?.includes('"${{ github.sha }}"'));

  assert.deepEqual(publish.needs, ['source', 'draft']);
  assert.equal(
    publish.if,
    "${{ needs.source.outputs.disposition == 'publishable' }}",
  );
  assert.equal(
    artifactDownload(publish)?.with?.name,
    'desktop-candidate-${{ needs.source.outputs.version }}',
  );
  const publishPublication = publicationStep(publish);
  assert.deepEqual(publishPublication?.env, {
    GH_TOKEN: '${{ github.token }}',
  });
  assert.ok(publishPublication?.run?.includes(' publish '));

  const tokenSteps = Object.values(workflow.jobs).flatMap((job) =>
    job.steps.filter(({ env }) => env?.GH_TOKEN !== undefined),
  );
  assert.deepEqual(tokenSteps, [draftPublication, publishPublication]);
  assert.equal(countRun(source, 'pnpm install --frozen-lockfile'), 7);
  assert.equal(countRun(source, 'release:native'), 5);
  assert.doesNotMatch(
    source,
    /pnpm --filter @csf\/desktop run release:[^\s]+ --(?:\s|$)/,
  );
  assert.doesNotMatch(
    source,
    /release\s+delete|--clobber|workflow_dispatch|softprops|electron-builder|blockmap|latest\.ya?ml|app-update/i,
  );
  assert.equal(Object.hasOwn(workflow.jobs, 'mac_intel'), false);
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (name !== 'native') {
      assert.equal(
        stepsWithRun(job).some(({ run }) => run?.includes('release:package')),
        false,
      );
    }
  }
});

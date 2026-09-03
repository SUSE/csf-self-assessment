import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  createNativeJobLog,
  createPnpmCommandRunner,
  planNativeJob,
  runNativeJob,
} from '../release/native-job.js';
import type { DesktopSystem } from '../release/contract.js';
import type {
  PnpmCommand,
  PnpmCommandRunner,
} from '../release/native-job.js';

const RELEASE_DIRECTORY = fileURLToPath(new URL('../release/', import.meta.url));
const DESKTOP_DIRECTORY = fileURLToPath(new URL('../', import.meta.url));
const SENTINEL = 'desktop-release-environment-sentinel';

async function createLogFiles(directory: string): Promise<{
  log: ReturnType<typeof createNativeJobLog>;
  close(): Promise<void>;
  read(): Promise<readonly [string, string]>;
}> {
  const jobPath = join(directory, 'job.log');
  const filePath = join(directory, 'file.log');
  const jobOutput = createWriteStream(jobPath);
  const fileOutput = createWriteStream(filePath);
  return {
    log: createNativeJobLog({ jobOutput, fileOutput }),
    async close(): Promise<void> {
      jobOutput.end();
      fileOutput.end();
      await Promise.all([finished(jobOutput), finished(fileOutput)]);
    },
    async read(): Promise<readonly [string, string]> {
      return Promise.all([
        readFile(jobPath, 'utf8'),
        readFile(filePath, 'utf8'),
      ]);
    },
  };
}

function runCli(file: string, arguments_: readonly string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', join(RELEASE_DIRECTORY, file), ...arguments_],
    {
      cwd: DESKTOP_DIRECTORY,
      encoding: 'utf8',
      env: { ...process.env, DESKTOP_RELEASE_TEST_SENTINEL: SENTINEL },
    },
  );
}

function assertConciseFailure(
  file: string,
  arguments_: readonly string[],
  expectedError: string,
): void {
  const result = runCli(file, arguments_);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, expectedError);
  assert.doesNotMatch(result.stderr, / at /);
  assert.doesNotMatch(result.stderr, new RegExp(SENTINEL));
}

test('native jobs plan package, native test, and staging in exact order', () => {
  const systems: readonly DesktopSystem[] = ['macos', 'windows', 'linux'];
  for (const system of systems) {
    assert.deepEqual(planNativeJob(system), {
      system,
      commands: [
        {
          kind: 'package',
          pnpmArguments: ['run', `release:package:${system}`],
        },
        {
          kind: 'test',
          pnpmArguments: [
            'exec',
            'node',
            '--import',
            'tsx',
            '--test',
            '--test-concurrency=1',
            `test/package-${system}.test.ts`,
          ],
        },
        {
          kind: 'stage',
          pnpmArguments: [
            'run',
            'release:stage',
            system,
            '../../dist/desktop',
            `../../dist/release-stage/${system}`,
          ],
        },
      ],
    });
  }
});

test('native jobs tee logs and stop on the exact failed command', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-native-job-'));
  const outputs = await createLogFiles(directory);
  const calls: PnpmCommand[] = [];
  const runner: PnpmCommandRunner = async (command, log) => {
    calls.push(command);
    if (command.kind === 'package') {
      log.write('package ok\n');
      return { kind: 'succeeded', exitCode: 0 };
    }
    if (command.kind === 'test') {
      log.write('native failed\n');
      return { kind: 'failed', exitCode: 23 };
    }
    log.write('stage should not run\n');
    return { kind: 'succeeded', exitCode: 0 };
  };

  try {
    const plan = planNativeJob('macos');
    const result = await runNativeJob(plan, runner, outputs.log);
    await outputs.close();

    assert.deepEqual(await outputs.read(), [
      'package ok\nnative failed\n',
      'package ok\nnative failed\n',
    ]);
    assert.deepEqual(calls, plan.commands.slice(0, 2));
    assert.deepEqual(result, {
      kind: 'failed',
      failure: {
        kind: 'command-failed',
        command: plan.commands[1],
        exitCode: 23,
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the pnpm runner streams stdout and stderr and keeps the exit code', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-pnpm-runner-'));
  const fakeNpmPath = join(directory, 'fake-npm.cjs');
  const outputs = await createLogFiles(directory);

  try {
    await writeFile(
      fakeNpmPath,
      "process.stdout.write('stdout line\\n'); process.stderr.write('stderr line\\n'); process.exitCode = 7;\n",
      'utf8',
    );
    const runner = createPnpmCommandRunner({
      nodeExecutable: process.execPath,
      npmExecPath: fakeNpmPath,
      workingDirectory: directory,
      environment: { ...process.env, DESKTOP_RELEASE_TEST_SENTINEL: SENTINEL },
    });
    const command = planNativeJob('linux').commands[0];
    const result = await runner(command, outputs.log);
    await outputs.close();

    const [jobOutput, fileOutput] = await outputs.read();
    assert.match(jobOutput, /stdout line\n/);
    assert.match(jobOutput, /stderr line\n/);
    assert.equal(fileOutput, jobOutput);
    assert.doesNotMatch(jobOutput, new RegExp(SENTINEL));
    assert.deepEqual(result, { kind: 'failed', exitCode: 7 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the release gate writes the exact candidate outputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-release-gate-'));
  const outputPath = join(directory, 'github-output');
  const signedOutputPath = join(directory, 'github-output-signed');
  const nativeMatrix =
    'native_matrix={"include":[{"system":"macos","runner":"macos-26"},{"system":"windows","runner":"windows-2025"},{"system":"linux","runner":"ubuntu-24.04"}]}\n';
  const cleanMatrix =
    'clean_matrix={"include":[{"lane":"macos-arm64","system":"macos","runner":"macos-26"},{"lane":"macos-x64","system":"macos","runner":"macos-26-intel"},{"lane":"windows-x64","system":"windows","runner":"windows-2025"},{"lane":"linux-x64","system":"linux","runner":"ubuntu-24.04"}]}\n';

  try {
    const result = runCli('gate-cli.ts', [
      'v0.1.0-rc.16',
      'false',
      outputPath,
    ]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
    assert.equal(
      await readFile(outputPath, 'utf8'),
      `version=0.1.0-rc.16\ndisposition=candidate\ntrust=unsigned-candidate\n${nativeMatrix}${cleanMatrix}`,
    );

    const signedResult = runCli('gate-cli.ts', [
      'v0.1.0-rc.16',
      'true',
      signedOutputPath,
    ]);
    assert.equal(signedResult.status, 0);
    assert.equal(signedResult.stdout, '');
    assert.equal(signedResult.stderr, '');
    assert.equal(
      await readFile(signedOutputPath, 'utf8'),
      `version=0.1.0-rc.16\ndisposition=candidate\ntrust=signed-candidate\n${nativeMatrix}${cleanMatrix}`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('release CLIs reject missing and invalid typed arguments concisely', () => {
  const cases: readonly [string, readonly string[], string][] = [
    [
      'gate-cli.ts',
      [],
      'Usage: gate-cli.ts <tag> <false|true> <github-output-file>\n',
    ],
    [
      'native-job-cli.ts',
      [],
      'Usage: native-job-cli.ts <macos|windows|linux> <unsigned-candidate|signed-candidate>\n',
    ],
    [
      'stage-cli.ts',
      [],
      'Usage: stage-cli.ts <macos|windows|linux> <build-directory> <stage-directory>\n',
    ],
    [
      'assemble-cli.ts',
      [],
      'Usage: assemble-cli.ts <input-directory> <output-directory> <tag> <commit-sha> <node-version>\n',
    ],
    [
      'verify-cli.ts',
      [],
      'Usage: verify-cli.ts <candidate-directory>\n',
    ],
    [
      'gate-cli.ts',
      ['v0.1.0-rc.1', 'maybe', 'output'],
      'release: invalid-signing-readiness\n',
    ],
    [
      'gate-cli.ts',
      ['not-a-tag', 'false', 'output'],
      'release: invalid-tag\n',
    ],
    [
      'native-job-cli.ts',
      ['darwin', 'unsigned-candidate'],
      'Usage: native-job-cli.ts <macos|windows|linux> <unsigned-candidate|signed-candidate>\n',
    ],
    [
      'native-job-cli.ts',
      ['macos'],
      'Usage: native-job-cli.ts <macos|windows|linux> <unsigned-candidate|signed-candidate>\n',
    ],
    [
      'native-job-cli.ts',
      ['macos', 'local-proof'],
      'Usage: native-job-cli.ts <macos|windows|linux> <unsigned-candidate|signed-candidate>\n',
    ],
    [
      'stage-cli.ts',
      ['darwin', 'build', 'stage'],
      'Usage: stage-cli.ts <macos|windows|linux> <build-directory> <stage-directory>\n',
    ],
    [
      'assemble-cli.ts',
      ['input', 'output', 'v0.1.0-rc.1', 'bad-sha', '22.14.0'],
      'Usage: assemble-cli.ts <input-directory> <output-directory> <tag> <commit-sha> <node-version>\n',
    ],
    [
      'assemble-cli.ts',
      [
        'input',
        'output',
        'v0.1.0-rc.1',
        '0123456789abcdef0123456789abcdef01234567',
        '21.0.0',
      ],
      'Usage: assemble-cli.ts <input-directory> <output-directory> <tag> <commit-sha> <node-version>\n',
    ],
  ];

  for (const [file, arguments_, error] of cases) {
    assertConciseFailure(file, arguments_, error);
  }
});

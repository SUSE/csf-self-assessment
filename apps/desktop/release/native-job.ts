import { spawn } from 'node:child_process';

import type { DesktopSystem } from './contract.js';

export type PnpmArguments = readonly [string, ...string[]];
export type NativePackageCommand = {
  kind: 'package';
  pnpmArguments: PnpmArguments;
};
export type NativeTestCommand = {
  kind: 'test';
  pnpmArguments: PnpmArguments;
};
export type NativeStageCommand = {
  kind: 'stage';
  pnpmArguments: PnpmArguments;
};
export type NativeJobCommand =
  | NativePackageCommand
  | NativeTestCommand
  | NativeStageCommand;
export type NativeJobPlan = {
  system: DesktopSystem;
  commands: readonly [NativePackageCommand, NativeTestCommand, NativeStageCommand];
};
export type NativeCommandResult =
  | { kind: 'succeeded'; exitCode: 0 }
  | { kind: 'failed'; exitCode: number };
export type NativeJobFailure = {
  kind: 'command-failed';
  command: NativeJobCommand;
  exitCode: number;
};
export type NativeJobResult =
  | { kind: 'succeeded' }
  | { kind: 'failed'; failure: NativeJobFailure };

export type NativeJobLog = {
  write(chunk: string): void;
};
export type NativeJobLogOutputs = {
  jobOutput: NodeJS.WritableStream;
  fileOutput: NodeJS.WritableStream;
};
export type PnpmCommand = {
  kind: string;
  pnpmArguments: PnpmArguments;
};
export type PnpmCommandRunner = (
  command: PnpmCommand,
  log: NativeJobLog,
) => Promise<NativeCommandResult>;
export type PnpmCommandRunnerInput = {
  nodeExecutable: string;
  npmExecPath: string;
  workingDirectory: string;
  environment: NodeJS.ProcessEnv;
};

export function planNativeJob(system: DesktopSystem): NativeJobPlan {
  return {
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
  };
}

export function createNativeJobLog(outputs: NativeJobLogOutputs): NativeJobLog {
  return {
    write(chunk: string): void {
      outputs.jobOutput.write(chunk);
      outputs.fileOutput.write(chunk);
    },
  };
}

export function createPnpmCommandRunner(
  input: PnpmCommandRunnerInput,
): PnpmCommandRunner {
  return async (command, log) =>
    new Promise<NativeCommandResult>((resolve) => {
      const child = spawn(
        input.nodeExecutable,
        [input.npmExecPath, ...command.pnpmArguments],
        {
          cwd: input.workingDirectory,
          env: input.environment,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => log.write(chunk));
      child.stderr.on('data', (chunk: string) => log.write(chunk));
      child.once('error', () => {
        log.write('release: command failed to start\n');
        resolve({ kind: 'failed', exitCode: 1 });
      });
      child.once('close', (exitCode) => {
        if (exitCode === 0) {
          resolve({ kind: 'succeeded', exitCode: 0 });
          return;
        }
        resolve({ kind: 'failed', exitCode: exitCode ?? 1 });
      });
    });
}

export async function runNativeJob(
  plan: NativeJobPlan,
  runner: PnpmCommandRunner,
  log: NativeJobLog,
): Promise<NativeJobResult> {
  for (const command of plan.commands) {
    const result = await runner(command, log);
    if (result.kind === 'failed') {
      return {
        kind: 'failed',
        failure: {
          kind: 'command-failed',
          command,
          exitCode: result.exitCode,
        },
      };
    }
  }
  return { kind: 'succeeded' };
}

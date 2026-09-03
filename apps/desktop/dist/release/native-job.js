import { spawn } from 'node:child_process';
export function planNativeJob(system) {
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
export function createNativeJobLog(outputs) {
    return {
        write(chunk) {
            outputs.jobOutput.write(chunk);
            outputs.fileOutput.write(chunk);
        },
    };
}
export function createPnpmCommandRunner(input) {
    return async (command, log) => new Promise((resolve) => {
        const child = spawn(input.nodeExecutable, [input.npmExecPath, ...command.pnpmArguments], {
            cwd: input.workingDirectory,
            env: input.environment,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => log.write(chunk));
        child.stderr.on('data', (chunk) => log.write(chunk));
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
export async function runNativeJob(plan, runner, log) {
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

import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { fail } from './cli-fail.js';
import { CandidateTrustSchema, DesktopSystemSchema, } from './contract.js';
import { createNativeJobLog, createPnpmCommandRunner, planNativeJob, runNativeJob, } from './native-job.js';
import { withSigningEnvironment } from './native-signing.js';
const UsageSchema = z.tuple([DesktopSystemSchema, CandidateTrustSchema]);
const USAGE = 'Usage: native-job-cli.ts <macos|windows|linux> <unsigned-candidate|signed-candidate>\n';
async function main() {
    const parsed = UsageSchema.safeParse(process.argv.slice(2));
    if (!parsed.success) {
        process.stderr.write(USAGE);
        process.exitCode = 1;
        return;
    }
    const [system, trust] = parsed.data;
    const npmExecPath = process.env.npm_execpath;
    if (npmExecPath === undefined) {
        throw new Error('npm_execpath is required');
    }
    const workingDirectory = fileURLToPath(new URL('../', import.meta.url));
    const logDirectory = join(workingDirectory, 'dist/release-logs');
    await mkdir(logDirectory, { recursive: true });
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'csf-native-job-'));
    try {
        await withSigningEnvironment({
            system,
            trust,
            environment: {
                ...process.env,
                CSF_DESKTOP_PACKAGE_SYSTEM: system,
            },
            temporaryRoot,
        }, async (environment) => {
            const fileOutput = createWriteStream(join(logDirectory, `${system}.log`), { flags: 'w' });
            const log = createNativeJobLog({
                jobOutput: process.stdout,
                fileOutput,
            });
            const runner = createPnpmCommandRunner({
                nodeExecutable: process.execPath,
                npmExecPath,
                workingDirectory,
                environment,
            });
            const result = await runNativeJob(planNativeJob(system), runner, log);
            fileOutput.end();
            await finished(fileOutput);
            if (result.kind === 'failed') {
                process.exitCode = result.failure.exitCode;
            }
        });
    }
    finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
}
void main().catch(fail);

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { fail } from './cli-fail.js';
import {
  CandidateTrustSchema,
  CleanHostLaneSchema,
  PACKAGE_TRUST_VARIABLE,
} from './contract.js';
import {
  planCleanHostTest,
  prepareCleanHostCandidate,
} from './clean-host.js';
import {
  createNativeJobLog,
  createPnpmCommandRunner,
} from './native-job.js';

const UsageSchema = z.tuple([
  CleanHostLaneSchema,
  CandidateTrustSchema,
  z.string().min(1),
]);
const USAGE =
  'Usage: clean-host-cli.ts <macos-arm64|macos-x64|windows-x64|linux-x64> <unsigned-candidate|signed-candidate> <candidate-directory>\n';

async function main(): Promise<void> {
  const parsed = UsageSchema.safeParse(process.argv.slice(2));
  if (!parsed.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const [lane, trust, candidateDirectory] = parsed.data;
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath === undefined) {
    throw new Error('npm_execpath is required');
  }
  const repositoryDirectory = fileURLToPath(new URL('../../../', import.meta.url));
  const workingDirectory = fileURLToPath(new URL('../', import.meta.url));
  await prepareCleanHostCandidate({
    lane,
    candidateDirectory,
    repositoryDirectory,
  });

  const logDirectory = join(workingDirectory, 'dist/release-logs');
  await mkdir(logDirectory, { recursive: true });
  const fileOutput = createWriteStream(join(logDirectory, `clean-${lane}.log`), {
    flags: 'w',
  });
  const log = createNativeJobLog({
    jobOutput: process.stdout,
    fileOutput,
  });
  const runner = createPnpmCommandRunner({
    nodeExecutable: process.execPath,
    npmExecPath,
    workingDirectory,
    environment: {
      ...process.env,
      [PACKAGE_TRUST_VARIABLE]: trust,
    },
  });
  const result = await runner(planCleanHostTest(lane), log);
  fileOutput.end();
  await finished(fileOutput);
  if (result.kind === 'failed') {
    process.exitCode = result.exitCode;
  }
}

void main().catch(fail);

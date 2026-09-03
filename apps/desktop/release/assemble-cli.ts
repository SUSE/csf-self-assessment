import { z } from 'zod';

import { fail } from './cli-fail.js';
import {
  CommitShaSchema,
  readRootReleaseVersion,
  requireReleaseTagForVersion,
} from './contract.js';
import { assembleCandidate } from './evidence.js';

const UsageSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.string().min(1),
  z.string().min(1),
  z.string().regex(/^22\./),
]);
const USAGE =
  'Usage: assemble-cli.ts <input-directory> <output-directory> <tag> <commit-sha> <node-version>\n';

async function main(): Promise<void> {
  const parsed = UsageSchema.safeParse(process.argv.slice(2));
  if (!parsed.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const [inputDirectory, outputDirectory, suppliedTag, commitValue, nodeVersion] =
    parsed.data;
  const commit = CommitShaSchema.safeParse(commitValue);
  if (!commit.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const version = readRootReleaseVersion(
    new URL('../../../package.json', import.meta.url),
  );
  const tag = requireReleaseTagForVersion(version, suppliedTag);
  await assembleCandidate({
    inputDirectory,
    outputDirectory,
    version,
    tag,
    commit: commit.data,
    nodeVersion,
  });
}

void main().catch(fail);

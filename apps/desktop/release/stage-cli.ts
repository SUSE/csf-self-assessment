import { z } from 'zod';

import { fail } from './cli-fail.js';
import {
  DesktopSystemSchema,
  readRootReleaseVersion,
} from './contract.js';
import { stagePackageAssets } from './evidence.js';

const UsageSchema = z.tuple([
  DesktopSystemSchema,
  z.string().min(1),
  z.string().min(1),
]);
const USAGE =
  'Usage: stage-cli.ts <macos|windows|linux> <build-directory> <stage-directory>\n';

async function main(): Promise<void> {
  const parsed = UsageSchema.safeParse(process.argv.slice(2));
  if (!parsed.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const [system, buildDirectory, stageDirectory] = parsed.data;
  const version = readRootReleaseVersion(
    new URL('../../../package.json', import.meta.url),
  );
  await stagePackageAssets(system, version, buildDirectory, stageDirectory);
}

void main().catch(fail);

import { z } from 'zod';

import { fail } from './cli-fail.js';
import { releaseAssetNames } from './contract.js';
import { verifyCandidate } from './evidence.js';

const UsageSchema = z.tuple([z.string().min(1)]);
const USAGE = 'Usage: verify-cli.ts <candidate-directory>\n';

async function main(): Promise<void> {
  const parsed = UsageSchema.safeParse(process.argv.slice(2));
  if (!parsed.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const manifest = await verifyCandidate(parsed.data[0]);
  process.stdout.write(`${releaseAssetNames(manifest.version).join('\n')}\n`);
}

void main().catch(fail);

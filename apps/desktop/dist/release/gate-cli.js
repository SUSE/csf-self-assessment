import { appendFile } from 'node:fs/promises';
import { z } from 'zod';
import { fail } from './cli-fail.js';
import { ReleaseError, SigningReadinessSchema, candidateTrustFor, cleanHostMatrix, decideRelease, nativeBuildMatrix, readRootReleaseVersion, requireReleaseTagForVersion, } from './contract.js';
const UsageSchema = z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
]);
const USAGE = 'Usage: gate-cli.ts <tag> <false|true> <github-output-file>\n';
async function main() {
    const parsed = UsageSchema.safeParse(process.argv.slice(2));
    if (!parsed.success) {
        process.stderr.write(USAGE);
        process.exitCode = 1;
        return;
    }
    const [suppliedTag, readinessValue, outputFile] = parsed.data;
    const readiness = SigningReadinessSchema.safeParse(readinessValue);
    if (!readiness.success) {
        throw new ReleaseError({
            kind: 'invalid-signing-readiness',
            value: readinessValue,
        });
    }
    const version = readRootReleaseVersion(new URL('../../../package.json', import.meta.url));
    requireReleaseTagForVersion(version, suppliedTag);
    const decision = decideRelease(version, readiness.data);
    await appendFile(outputFile, `version=${version}\ndisposition=${decision.kind}\ntrust=${candidateTrustFor(readiness.data)}\nnative_matrix=${JSON.stringify({ include: nativeBuildMatrix() })}\nclean_matrix=${JSON.stringify({ include: cleanHostMatrix() })}\n`, 'utf8');
}
void main().catch(fail);

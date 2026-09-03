import { ReleaseError } from './contract.js';
export function fail(error) {
    if (error instanceof ReleaseError) {
        process.stderr.write(`release: ${error.failure.kind}\n`);
    }
    else if (error instanceof Error) {
        process.stderr.write(`release: ${error.message}\n`);
    }
    else {
        process.stderr.write('release: unexpected error\n');
    }
    process.exitCode = 1;
}

import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PACKAGE_TRUST_VARIABLE, SIGNING_SECRET_NAMES, ReleaseError, requiredSigningSecrets, } from './contract.js';
export const BUILDER_SIGNING_VARIABLE_NAMES = [
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
    'CSC_NAME',
    'CSC_IDENTITY_AUTO_DISCOVERY',
    'WIN_CSC_LINK',
    'WIN_CSC_KEY_PASSWORD',
    'APPLE_API_KEY',
    'APPLE_API_KEY_ID',
    'APPLE_API_ISSUER',
    'APPLE_ID',
    'APPLE_APP_SPECIFIC_PASSWORD',
    'APPLE_TEAM_ID',
];
export const APPLE_API_KEY_FILE = 'apple-api-key.p8';
export async function withSigningEnvironment(input, run) {
    const environment = { ...input.environment };
    for (const name of SIGNING_SECRET_NAMES) {
        delete environment[name];
    }
    for (const name of BUILDER_SIGNING_VARIABLE_NAMES) {
        delete environment[name];
    }
    environment[PACKAGE_TRUST_VARIABLE] = input.trust;
    for (const secret of requiredSigningSecrets(input.system, input.trust)) {
        if ((input.environment[secret] ?? '').trim() === '') {
            throw new ReleaseError({
                kind: 'missing-signing-secret',
                system: input.system,
                secret,
            });
        }
    }
    if (input.system === 'macos' && input.trust === 'signed-candidate') {
        const keyPath = join(input.temporaryRoot, APPLE_API_KEY_FILE);
        try {
            await writeFile(keyPath, input.environment.APPLE_API_KEY_P8 ?? '', {
                encoding: 'utf8',
                mode: 0o600,
            });
            environment.CSC_LINK = input.environment.MACOS_CSC_LINK;
            environment.CSC_KEY_PASSWORD = input.environment.MACOS_CSC_KEY_PASSWORD;
            environment.APPLE_API_KEY = keyPath;
            environment.APPLE_API_KEY_ID = input.environment.APPLE_API_KEY_ID;
            environment.APPLE_API_ISSUER = input.environment.APPLE_API_ISSUER;
            return await run(environment);
        }
        finally {
            await rm(keyPath, { force: true });
        }
    }
    if (input.system === 'windows' && input.trust === 'signed-candidate') {
        environment.CSC_LINK = input.environment.WINDOWS_CSC_LINK;
        environment.CSC_KEY_PASSWORD = input.environment.WINDOWS_CSC_KEY_PASSWORD;
    }
    return run(environment);
}

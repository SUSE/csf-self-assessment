import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
const SEMVER_IDENTIFIER = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const SEMVER_PRERELEASE = `(?:${SEMVER_IDENTIFIER})(?:\\.${SEMVER_IDENTIFIER})*`;
const SEMVER_BUILD = '[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*';
export const SEMVER_PATTERN = new RegExp(`^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-${SEMVER_PRERELEASE})?(?:\\+${SEMVER_BUILD})?$`);
export const RELEASE_TAG_PATTERN = new RegExp(`^v${SEMVER_PATTERN.source.slice(1)}`);
export const ReleaseVersionSchema = z
    .string()
    .regex(SEMVER_PATTERN)
    .brand();
export const ReleaseTagSchema = z
    .string()
    .regex(RELEASE_TAG_PATTERN)
    .brand();
export const CommitShaSchema = z
    .string()
    .regex(/^[0-9a-f]{40}$/)
    .brand();
export const Sha256Schema = z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .brand();
export const DesktopAppKindSchema = z.enum(['author', 'assessment']);
export const DesktopSystemSchema = z.enum(['macos', 'windows', 'linux']);
export const SigningReadinessSchema = z.enum(['false', 'true']);
export const PackageTrustSchema = z.enum([
    'local-proof',
    'unsigned-candidate',
    'signed-candidate',
]);
export const CandidateTrustSchema = z.enum([
    'unsigned-candidate',
    'signed-candidate',
]);
export const CleanHostLaneSchema = z.enum([
    'macos-arm64',
    'macos-x64',
    'windows-x64',
    'linux-x64',
]);
export const CleanHostMatrixEntrySchema = z.discriminatedUnion('lane', [
    z.object({
        lane: z.literal('macos-arm64'),
        system: z.literal('macos'),
        runner: z.literal('macos-26'),
    }).strict(),
    z.object({
        lane: z.literal('macos-x64'),
        system: z.literal('macos'),
        runner: z.literal('macos-26-intel'),
    }).strict(),
    z.object({
        lane: z.literal('windows-x64'),
        system: z.literal('windows'),
        runner: z.literal('windows-2025'),
    }).strict(),
    z.object({
        lane: z.literal('linux-x64'),
        system: z.literal('linux'),
        runner: z.literal('ubuntu-24.04'),
    }).strict(),
]);
export const GitHubRepositorySchema = z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .brand();
export const ReleaseAssetEvidenceSchema = z.object({
    file: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    sha256: Sha256Schema,
}).strict();
export const RemoteReleaseAssetSchema = z.object({
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
}).passthrough();
export const RemoteReleaseSchema = z.object({
    tag_name: ReleaseTagSchema,
    draft: z.boolean(),
    prerelease: z.boolean(),
    assets: z.array(RemoteReleaseAssetSchema),
}).passthrough();
export const RepositoryVisibilitySchema = z.object({
    visibility: z.literal('PRIVATE'),
}).passthrough();
export const GitHubReleaseOperationSchema = z.enum([
    'inspect-repository',
    'create-draft',
    'upload-assets',
    'inspect-release',
    'publish-release',
]);
export const SigningSecretNameSchema = z.enum([
    'MACOS_CSC_LINK',
    'MACOS_CSC_KEY_PASSWORD',
    'APPLE_API_KEY_P8',
    'APPLE_API_KEY_ID',
    'APPLE_API_ISSUER',
    'WINDOWS_CSC_LINK',
    'WINDOWS_CSC_KEY_PASSWORD',
]);
export const SIGNING_SECRET_NAMES = SigningSecretNameSchema.options;
export const PACKAGE_TRUST_VARIABLE = 'CSF_DESKTOP_PACKAGE_TRUST';
const FileEvidenceSchema = z
    .object({
    file: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    sha256: Sha256Schema,
})
    .strict();
const PackageEvidenceBase = {
    app: DesktopAppKindSchema,
    ...FileEvidenceSchema.shape,
};
export const PackageEvidenceSchema = z.discriminatedUnion('system', [
    z
        .object({
        ...PackageEvidenceBase,
        system: z.literal('macos'),
        cpu: z.literal('universal'),
        format: z.enum(['dmg', 'zip']),
    })
        .strict(),
    z
        .object({
        ...PackageEvidenceBase,
        system: z.literal('windows'),
        cpu: z.literal('x64'),
        format: z.literal('nsis'),
    })
        .strict(),
    z
        .object({
        ...PackageEvidenceBase,
        system: z.literal('linux'),
        cpu: z.literal('x64'),
        format: z.enum(['appimage', 'deb', 'rpm']),
    })
        .strict(),
]);
export const ReleaseManifestSchema = z
    .object({
    schemaVersion: z.literal(1),
    version: ReleaseVersionSchema,
    tag: ReleaseTagSchema,
    commit: CommitShaSchema,
    toolchain: z
        .object({
        electron: z.literal('43.4.0'),
        electronBuilder: z.literal('26.15.3'),
        node: z.string().regex(/^22\./),
        pnpm: z.literal('11.13.0'),
    })
        .strict(),
    renderers: z
        .object({
        author: FileEvidenceSchema.extend({ file: z.literal('author.html') }),
        assessment: FileEvidenceSchema.extend({
            file: z.literal('assessment.html'),
        }),
    })
        .strict(),
    packages: z.array(PackageEvidenceSchema).length(12),
    sbom: FileEvidenceSchema,
})
    .strict();
export class ReleaseError extends Error {
    failure;
    constructor(failure) {
        super(failure.kind);
        this.failure = failure;
        this.name = 'ReleaseError';
    }
}
export const AUTHOR_TARGET = {
    kind: 'author',
    packageName: 'csf-author',
    applicationId: 'org.csf.selfassessment.author',
    productName: 'CSF Author',
    windowTitle: 'CSF Author',
    rendererDirectory: 'author',
    rendererFile: 'author.html',
    startUrl: 'csf://author/',
    description: 'Create and test Cloud Sovereignty Self-Assessment workbooks offline.',
};
export const ASSESSMENT_TARGET = {
    kind: 'assessment',
    packageName: 'csf-assessment',
    applicationId: 'org.csf.selfassessment.assessment',
    productName: 'CSF Assessment',
    windowTitle: 'CSF Assessment',
    rendererDirectory: 'assessment',
    rendererFile: 'assessment.html',
    startUrl: 'csf://assessment/',
    description: 'Complete and review Cloud Sovereignty Self-Assessments offline.',
};
const RootPackageSchema = z.object({ version: ReleaseVersionSchema }).passthrough();
const DESKTOP_APP_KINDS = ['author', 'assessment'];
const PACKAGE_TARGETS = [
    { system: 'macos', cpu: 'universal', format: 'dmg', extension: 'dmg' },
    { system: 'macos', cpu: 'universal', format: 'zip', extension: 'zip' },
    { system: 'windows', cpu: 'x64', format: 'nsis', extension: 'exe' },
    {
        system: 'linux',
        cpu: 'x64',
        format: 'appimage',
        extension: 'AppImage',
    },
    { system: 'linux', cpu: 'x64', format: 'deb', extension: 'deb' },
    { system: 'linux', cpu: 'x64', format: 'rpm', extension: 'rpm' },
];
export function readRootReleaseVersion(rootPackageUrl) {
    const path = fileURLToPath(rootPackageUrl);
    try {
        const parsed = RootPackageSchema.safeParse(JSON.parse(readFileSync(rootPackageUrl, 'utf8')));
        if (!parsed.success) {
            throw new ReleaseError({ kind: 'invalid-root-package', path });
        }
        return parsed.data.version;
    }
    catch (error) {
        if (error instanceof ReleaseError) {
            throw error;
        }
        throw new ReleaseError({ kind: 'invalid-root-package', path });
    }
}
export function releaseTagFor(version) {
    return ReleaseTagSchema.parse(`v${version}`);
}
export function requireReleaseTagForVersion(version, suppliedTag) {
    const parsed = ReleaseTagSchema.safeParse(suppliedTag);
    if (!parsed.success) {
        throw new ReleaseError({ kind: 'invalid-tag', tag: suppliedTag });
    }
    const expected = releaseTagFor(version);
    if (parsed.data !== expected) {
        throw new ReleaseError({
            kind: 'tag-version-mismatch',
            expected,
            actual: parsed.data,
        });
    }
    return parsed.data;
}
export function decideRelease(version, readiness) {
    if (version.split('+', 1)[0]?.includes('-') === true) {
        return { kind: 'candidate', reason: 'prerelease-version' };
    }
    if (readiness === 'false') {
        return { kind: 'candidate', reason: 'signing-not-ready' };
    }
    return { kind: 'publishable' };
}
export function candidateTrustFor(readiness) {
    return readiness === 'true' ? 'signed-candidate' : 'unsigned-candidate';
}
export function requiredSigningSecrets(system, trust) {
    if (trust === 'unsigned-candidate' || system === 'linux') {
        return [];
    }
    if (system === 'macos') {
        return [
            'MACOS_CSC_LINK',
            'MACOS_CSC_KEY_PASSWORD',
            'APPLE_API_KEY_P8',
            'APPLE_API_KEY_ID',
            'APPLE_API_ISSUER',
        ];
    }
    return ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD'];
}
export function readPackageTrust(environment) {
    const value = environment[PACKAGE_TRUST_VARIABLE] ?? '';
    const parsed = PackageTrustSchema.safeParse(value);
    if (!parsed.success) {
        throw new ReleaseError({ kind: 'invalid-package-trust', value });
    }
    return parsed.data;
}
export function packageAssetName(app, target, version) {
    return `csf-${app}-${version}-${target.system}-${target.cpu}.${target.extension}`;
}
export function packageAssets(version) {
    return DESKTOP_APP_KINDS.flatMap((app) => PACKAGE_TARGETS.map((target) => ({
        ...target,
        app,
        file: packageAssetName(app, target, version),
    })));
}
export function releaseAssetNames(version) {
    return [
        'author.html',
        'assessment.html',
        ...packageAssets(version).map(({ file }) => file),
        `csf-self-assessment-${version}.cdx.json`,
        'release-manifest.json',
        'SHA256SUMS',
    ];
}
export function nativeBuildMatrix() {
    return [
        { system: 'macos', runner: 'macos-26' },
        { system: 'windows', runner: 'windows-2025' },
        { system: 'linux', runner: 'ubuntu-24.04' },
    ];
}
export function cleanHostMatrix() {
    return [
        { lane: 'macos-arm64', system: 'macos', runner: 'macos-26' },
        { lane: 'macos-x64', system: 'macos', runner: 'macos-26-intel' },
        { lane: 'windows-x64', system: 'windows', runner: 'windows-2025' },
        { lane: 'linux-x64', system: 'linux', runner: 'ubuntu-24.04' },
    ];
}

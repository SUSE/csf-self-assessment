import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RemoteReleaseSchema, RepositoryVisibilitySchema, ReleaseError, Sha256Schema, releaseAssetNames, } from './contract.js';
import { verifyCandidate } from './evidence.js';
function ghArguments(first, ...rest) {
    return [first, ...rest];
}
function sha256(bytes) {
    return Sha256Schema.parse(createHash('sha256').update(bytes).digest('hex'));
}
async function evidenceFor(candidateDirectory, version) {
    return Promise.all(releaseAssetNames(version).map(async (file) => {
        const bytes = await readFile(join(candidateDirectory, file));
        return { file, bytes: bytes.length, sha256: sha256(bytes) };
    }));
}
function requireContext(actualTag, actualCommit, expectedTag, expectedCommit) {
    if (actualTag !== expectedTag) {
        throw new ReleaseError({ kind: 'release-context-mismatch', field: 'tag' });
    }
    if (actualCommit !== expectedCommit) {
        throw new ReleaseError({ kind: 'release-context-mismatch', field: 'commit' });
    }
}
async function requireSucceeded(operation, arguments_, run) {
    const result = await run(operation, arguments_);
    if (result.kind === 'failed') {
        throw new ReleaseError({
            kind: 'github-command-failed',
            operation,
            exitCode: result.exitCode,
        });
    }
    return result.stdout;
}
function parseRemoteRelease(stdout, tag) {
    try {
        return RemoteReleaseSchema.parse(JSON.parse(stdout));
    }
    catch {
        throw new ReleaseError({ kind: 'invalid-remote-release', tag });
    }
}
function requireRemoteRelease(remote, tag, expectedState, evidence) {
    if (remote.tag_name !== tag || !remote.prerelease) {
        throw new ReleaseError({ kind: 'invalid-remote-release', tag });
    }
    const actualState = remote.draft ? 'draft' : 'published';
    if (actualState !== expectedState) {
        throw new ReleaseError({
            kind: 'remote-release-state',
            expected: expectedState,
            actual: actualState,
        });
    }
    if (remote.assets.length !== evidence.length) {
        throw new ReleaseError({ kind: 'invalid-remote-release', tag });
    }
    for (const local of evidence) {
        const matches = remote.assets.filter(({ name }) => name === local.file);
        if (matches.length !== 1 ||
            matches[0]?.size !== local.bytes ||
            matches[0]?.digest !== `sha256:${local.sha256}`) {
            throw new ReleaseError({ kind: 'invalid-remote-release', tag });
        }
    }
}
async function inspectRelease(repository, tag, run) {
    const stdout = await requireSucceeded('inspect-release', ghArguments('api', `repos/${repository}/releases/tags/${tag}`), run);
    return parseRemoteRelease(stdout, tag);
}
export function createGhRunner(input) {
    return async (_operation, arguments_) => new Promise((resolve) => {
        const child = spawn(input.executable, arguments_, {
            cwd: input.workingDirectory,
            env: input.environment,
            shell: false,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        let stdout = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.once('error', () => {
            resolve({ kind: 'failed', exitCode: 1 });
        });
        child.once('close', (exitCode) => {
            if (exitCode === 0) {
                resolve({ kind: 'succeeded', stdout });
                return;
            }
            resolve({ kind: 'failed', exitCode: exitCode ?? 1 });
        });
    });
}
export async function releaseAssetEvidence(candidateDirectory) {
    const manifest = await verifyCandidate(candidateDirectory);
    return evidenceFor(candidateDirectory, manifest.version);
}
export async function createVerifiedDraft(input, run) {
    const manifest = await verifyCandidate(input.candidateDirectory);
    requireContext(manifest.tag, manifest.commit, input.expectedTag, input.expectedCommit);
    const evidence = await evidenceFor(input.candidateDirectory, manifest.version);
    const repositoryOutput = await requireSucceeded('inspect-repository', ghArguments('repo', 'view', input.repository, '--json', 'visibility'), run);
    try {
        RepositoryVisibilitySchema.parse(JSON.parse(repositoryOutput));
    }
    catch {
        throw new ReleaseError({
            kind: 'repository-not-private',
            repository: input.repository,
        });
    }
    await requireSucceeded('create-draft', ghArguments('release', 'create', input.expectedTag, '--repo', input.repository, '--draft', '--prerelease', '--verify-tag', '--generate-notes', '--notes-file', input.notesFile), run);
    await requireSucceeded('upload-assets', ghArguments('release', 'upload', input.expectedTag, ...releaseAssetNames(manifest.version).map((file) => join(input.candidateDirectory, file)), '--repo', input.repository), run);
    const remote = await inspectRelease(input.repository, input.expectedTag, run);
    requireRemoteRelease(remote, input.expectedTag, 'draft', evidence);
    return remote;
}
export async function publishVerifiedDraft(input, run) {
    const manifest = await verifyCandidate(input.candidateDirectory);
    requireContext(manifest.tag, manifest.commit, input.expectedTag, input.expectedCommit);
    const evidence = await evidenceFor(input.candidateDirectory, manifest.version);
    const draft = await inspectRelease(input.repository, input.expectedTag, run);
    requireRemoteRelease(draft, input.expectedTag, 'draft', evidence);
    await requireSucceeded('publish-release', ghArguments('release', 'edit', input.expectedTag, '--draft=false', '--prerelease', '--latest=false', '--repo', input.repository), run);
    const published = await inspectRelease(input.repository, input.expectedTag, run);
    requireRemoteRelease(published, input.expectedTag, 'published', evidence);
    return published;
}

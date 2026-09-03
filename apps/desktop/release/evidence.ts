import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import {
  PackageEvidenceSchema,
  ReleaseError,
  ReleaseManifestSchema,
  Sha256Schema,
  packageAssets,
  releaseAssetNames,
} from './contract.js';
import type {
  CommitSha,
  DesktopSystem,
  PackageAssetContract,
  ReleaseManifest,
  ReleaseTag,
  ReleaseVersion,
  Sha256,
} from './contract.js';
import {
  createDesktopSbom,
  validateDesktopSbom,
} from './sbom.js';
import type { PackagedDependency } from './sbom.js';

export type CandidateAssemblyInput = {
  inputDirectory: string;
  outputDirectory: string;
  version: ReleaseVersion;
  tag: ReleaseTag;
  commit: CommitSha;
  nodeVersion: string;
};

type FileEvidence = {
  file: string;
  bytes: number;
  sha256: Sha256;
};

const require = createRequire(import.meta.url);
const InstalledPackageSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    license: z.string().min(1),
  })
  .passthrough();

function sha256(bytes: Buffer): Sha256 {
  return Sha256Schema.parse(createHash('sha256').update(bytes).digest('hex'));
}

async function fileEvidence(
  directory: string,
  file: string,
): Promise<FileEvidence> {
  const bytes = await readFile(join(directory, file));
  return { file, bytes: bytes.length, sha256: sha256(bytes) };
}

function expectedInputNames(version: ReleaseVersion): readonly string[] {
  return [
    'author.html',
    'assessment.html',
    ...packageAssets(version).map(({ file }) => file),
  ];
}

function firstDifference(
  actual: readonly string[],
  expected: readonly string[],
): { kind: 'missing-asset' | 'unexpected-asset'; file: string } | undefined {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expected].sort().find((file) => !actualSet.has(file));
  if (missing !== undefined) {
    return { kind: 'missing-asset', file: missing };
  }
  const unexpected = [...actual].sort().find((file) => !expectedSet.has(file));
  if (unexpected !== undefined) {
    return { kind: 'unexpected-asset', file: unexpected };
  }
  return undefined;
}

function requireExactNames(
  actual: readonly string[],
  expected: readonly string[],
): void {
  const difference = firstDifference(actual, expected);
  if (difference !== undefined) {
    throw new ReleaseError(difference);
  }
}

function readInstalledDependency(
  name: PackagedDependency['name'],
  type: PackagedDependency['type'],
): PackagedDependency {
  const packagePath = require.resolve(`${name}/package.json`);
  const parsed = InstalledPackageSchema.parse(
    JSON.parse(readFileSync(packagePath, 'utf8')),
  );
  if (parsed.name !== name) {
    throw new Error(`Installed package name mismatch: ${name}`);
  }
  return { type, name, version: parsed.version, license: parsed.license };
}

function packageEvidence(
  asset: PackageAssetContract,
  evidence: FileEvidence,
): z.infer<typeof PackageEvidenceSchema> {
  return PackageEvidenceSchema.parse({
    app: asset.app,
    system: asset.system,
    cpu: asset.cpu,
    format: asset.format,
    ...evidence,
  });
}

async function parseManifest(candidateDirectory: string): Promise<ReleaseManifest> {
  const file = 'release-manifest.json';
  try {
    return ReleaseManifestSchema.parse(
      JSON.parse(await readFile(join(candidateDirectory, file), 'utf8')),
    );
  } catch {
    throw new ReleaseError({ kind: 'invalid-manifest', file });
  }
}

async function verifyFileEvidence(
  candidateDirectory: string,
  evidence: FileEvidence,
): Promise<void> {
  const bytes = await readFile(join(candidateDirectory, evidence.file));
  if (bytes.length !== evidence.bytes) {
    throw new ReleaseError({
      kind: 'size-mismatch',
      file: evidence.file,
      expected: evidence.bytes,
      actual: bytes.length,
    });
  }
  const actual = sha256(bytes);
  if (actual !== evidence.sha256) {
    throw new ReleaseError({
      kind: 'hash-mismatch',
      file: evidence.file,
      expected: evidence.sha256,
      actual,
    });
  }
}

function validatePackageRows(manifest: ReleaseManifest): void {
  const assets = packageAssets(manifest.version);
  for (const asset of assets) {
    const row = manifest.packages.find(({ file }) => file === asset.file);
    if (
      row === undefined ||
      row.app !== asset.app ||
      row.system !== asset.system ||
      row.cpu !== asset.cpu ||
      row.format !== asset.format
    ) {
      throw new ReleaseError({ kind: 'invalid-manifest', file: asset.file });
    }
  }
}

export async function stagePackageAssets(
  system: DesktopSystem,
  version: ReleaseVersion,
  buildDirectory: string,
  stageDirectory: string,
): Promise<readonly string[]> {
  const assets = packageAssets(version).filter(
    (asset) => asset.system === system,
  );
  for (const asset of assets) {
    try {
      await access(join(buildDirectory, asset.app, asset.file));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new ReleaseError({ kind: 'missing-asset', file: asset.file });
      }
      throw error;
    }
  }

  await mkdir(stageDirectory, { recursive: true });
  for (const asset of assets) {
    await copyFile(
      join(buildDirectory, asset.app, asset.file),
      join(stageDirectory, asset.file),
    );
  }
  return assets.map(({ file }) => file);
}

export async function assembleCandidate(
  input: CandidateAssemblyInput,
): Promise<ReleaseManifest> {
  const actualInputNames = await readdir(input.inputDirectory);
  requireExactNames(actualInputNames, expectedInputNames(input.version));
  await mkdir(input.outputDirectory);

  for (const file of expectedInputNames(input.version)) {
    await copyFile(
      join(input.inputDirectory, file),
      join(input.outputDirectory, file),
    );
  }

  const dependencies: readonly PackagedDependency[] = [
    readInstalledDependency('electron', 'framework'),
    readInstalledDependency('zod', 'library'),
  ];
  const sbomFile = `csf-self-assessment-${input.version}.cdx.json`;
  const sbom = await createDesktopSbom(input.version, dependencies);
  await writeFile(join(input.outputDirectory, sbomFile), sbom, 'utf8');

  const author = await fileEvidence(input.outputDirectory, 'author.html');
  const assessment = await fileEvidence(input.outputDirectory, 'assessment.html');
  const packages = await Promise.all(
    packageAssets(input.version).map(async (asset) =>
      packageEvidence(
        asset,
        await fileEvidence(input.outputDirectory, asset.file),
      ),
    ),
  );
  const manifest = ReleaseManifestSchema.parse({
    schemaVersion: 1,
    version: input.version,
    tag: input.tag,
    commit: input.commit,
    toolchain: {
      electron: '43.4.0',
      electronBuilder: '26.15.3',
      node: input.nodeVersion,
      pnpm: '11.13.0',
    },
    renderers: { author, assessment },
    packages,
    sbom: await fileEvidence(input.outputDirectory, sbomFile),
  });
  await writeFile(
    join(input.outputDirectory, 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const checksumNames = (await readdir(input.outputDirectory)).sort();
  const checksumLines = await Promise.all(
    checksumNames.map(async (file) => {
      const bytes = await readFile(join(input.outputDirectory, file));
      return `${sha256(bytes)}  ${file}\n`;
    }),
  );
  await writeFile(
    join(input.outputDirectory, 'SHA256SUMS'),
    checksumLines.join(''),
    'utf8',
  );

  return verifyCandidate(input.outputDirectory);
}

export async function verifyCandidate(
  candidateDirectory: string,
): Promise<ReleaseManifest> {
  const initialNames = await readdir(candidateDirectory);
  if (!initialNames.includes('release-manifest.json')) {
    throw new ReleaseError({
      kind: 'missing-asset',
      file: 'release-manifest.json',
    });
  }
  const manifest = await parseManifest(candidateDirectory);
  requireExactNames(initialNames, releaseAssetNames(manifest.version));

  const expectedSbomFile = `csf-self-assessment-${manifest.version}.cdx.json`;
  if (manifest.sbom.file !== expectedSbomFile) {
    throw new ReleaseError({
      kind: 'invalid-manifest',
      file: 'release-manifest.json',
    });
  }
  validatePackageRows(manifest);

  await verifyFileEvidence(candidateDirectory, manifest.renderers.author);
  await verifyFileEvidence(candidateDirectory, manifest.renderers.assessment);
  for (const row of manifest.packages) {
    await verifyFileEvidence(candidateDirectory, row);
  }
  await verifyFileEvidence(candidateDirectory, manifest.sbom);

  try {
    await validateDesktopSbom(
      await readFile(join(candidateDirectory, manifest.sbom.file), 'utf8'),
    );
  } catch {
    throw new ReleaseError({ kind: 'invalid-sbom', file: manifest.sbom.file });
  }

  const checksumNames = initialNames
    .filter((file) => file !== 'SHA256SUMS')
    .sort();
  const expectedChecksums = (
    await Promise.all(
      checksumNames.map(async (file) => {
        const bytes = await readFile(join(candidateDirectory, file));
        return `${sha256(bytes)}  ${file}\n`;
      }),
    )
  ).join('');
  const actualChecksums = await readFile(
    join(candidateDirectory, 'SHA256SUMS'),
    'utf8',
  );
  if (actualChecksums !== expectedChecksums) {
    throw new ReleaseError({ kind: 'invalid-checksums', file: 'SHA256SUMS' });
  }

  return manifest;
}

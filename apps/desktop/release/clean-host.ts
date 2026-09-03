import { chmod, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { packageAssets } from './contract.js';
import type {
  CleanHostLane,
  DesktopSystem,
  ReleaseManifest,
} from './contract.js';
import { verifyCandidate } from './evidence.js';
import type { PnpmArguments } from './native-job.js';

export type CleanHostPreparationInput = {
  lane: CleanHostLane;
  candidateDirectory: string;
  repositoryDirectory: string;
};

export type CleanHostTestCommand = {
  kind: 'clean-host-test';
  lane: CleanHostLane;
  pnpmArguments: PnpmArguments;
};

export function cleanHostSystem(lane: CleanHostLane): DesktopSystem {
  if (lane === 'macos-arm64' || lane === 'macos-x64') {
    return 'macos';
  }
  if (lane === 'windows-x64') {
    return 'windows';
  }
  return 'linux';
}

export function planCleanHostTest(lane: CleanHostLane): CleanHostTestCommand {
  const system = cleanHostSystem(lane);
  return {
    kind: 'clean-host-test',
    lane,
    pnpmArguments: [
      'exec',
      'node',
      '--import',
      'tsx',
      '--test',
      '--test-concurrency=1',
      `test/package-${system}.test.ts`,
    ],
  };
}

export async function prepareCleanHostCandidate(
  input: CleanHostPreparationInput,
): Promise<ReleaseManifest> {
  const manifest = await verifyCandidate(input.candidateDirectory);
  const renderers = [
    { app: 'author', file: manifest.renderers.author.file },
    { app: 'assessment', file: manifest.renderers.assessment.file },
  ];
  for (const renderer of renderers) {
    const directory = join(
      input.repositoryDirectory,
      'apps',
      renderer.app,
      'dist',
    );
    await mkdir(directory, { recursive: true });
    await copyFile(
      join(input.candidateDirectory, renderer.file),
      join(directory, renderer.file),
    );
  }

  const system = cleanHostSystem(input.lane);
  for (const asset of packageAssets(manifest.version).filter(
    (entry) => entry.system === system,
  )) {
    const directory = join(
      input.repositoryDirectory,
      'dist',
      'desktop',
      asset.app,
    );
    await mkdir(directory, { recursive: true });
    const outputPath = join(directory, asset.file);
    await copyFile(join(input.candidateDirectory, asset.file), outputPath);
    if (asset.format === 'appimage') {
      await chmod(outputPath, 0o755);
    }
  }

  return manifest;
}

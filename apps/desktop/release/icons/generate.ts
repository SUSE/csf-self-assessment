import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { IconIcns, IconIco } from '@shockpkg/icon-encoder';
import sharp from 'sharp';

export type IconGenerationMode = 'generate' | 'check';
export type IconVariant = 'author' | 'assessment';
export type GeneratedIconSet = {
  variant: IconVariant;
  files: readonly string[];
};

const PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const ICO_SIZES = [256, 128, 64, 48, 32, 16];
const GENERATED_FILES = [
  ...PNG_SIZES.map((size) => `icon-${size}.png`),
  'icon.icns',
  'icon.ico',
];
const VARIANTS: readonly IconVariant[] = ['author', 'assessment'];

async function renderPngs(
  sourceUrl: URL,
  outputDirectory: string,
  variant: IconVariant,
): Promise<Map<number, Buffer>> {
  const source = await readFile(sourceUrl);
  const left = variant === 'author' ? 0 : 1024;
  const pngs = new Map<number, Buffer>();

  for (const size of PNG_SIZES) {
    const png = await sharp(source)
      .extract({ left, top: 0, width: 1024, height: 1024 })
      .resize(size, size)
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
    pngs.set(size, png);
    await writeFile(join(outputDirectory, `icon-${size}.png`), png);
  }

  return pngs;
}

function requirePng(pngs: ReadonlyMap<number, Buffer>, size: number): Buffer {
  const png = pngs.get(size);
  if (png === undefined) {
    throw new Error(`Missing generated ${size}px PNG`);
  }
  return png;
}

async function writeIco(
  outputDirectory: string,
  pngs: ReadonlyMap<number, Buffer>,
): Promise<void> {
  const ico = new IconIco();
  for (const size of ICO_SIZES) {
    await ico.addFromPng(requirePng(pngs, size), true, true);
  }
  await writeFile(join(outputDirectory, 'icon.ico'), ico.encode());
}

async function writeIcns(
  outputDirectory: string,
  pngs: ReadonlyMap<number, Buffer>,
): Promise<void> {
  const icns = new IconIcns();
  await icns.addFromPng(requirePng(pngs, 64), ['ic12'], true);
  await icns.addFromPng(requirePng(pngs, 128), ['ic07'], true);
  await icns.addFromPng(requirePng(pngs, 256), ['ic13', 'ic08'], true);
  await icns.addFromPng(requirePng(pngs, 16), ['ic04'], true);
  await icns.addFromPng(requirePng(pngs, 512), ['ic14', 'ic09'], true);
  await icns.addFromPng(requirePng(pngs, 32), ['ic05', 'ic11'], true);
  await icns.addFromPng(requirePng(pngs, 1024), ['ic10'], true);
  await writeFile(join(outputDirectory, 'icon.icns'), icns.encode());
}

async function replaceDirectory(
  stagedDirectory: string,
  outputDirectory: string,
): Promise<void> {
  const parent = dirname(outputDirectory);
  const swapRoot = await mkdtemp(join(parent, '.icon-swap-'));
  const staged = join(swapRoot, 'new');
  const previous = join(swapRoot, 'old');
  await rename(stagedDirectory, staged);

  let previousExists = false;
  try {
    try {
      await rename(outputDirectory, previous);
      previousExists = true;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }

    await rename(staged, outputDirectory);
    if (previousExists) {
      await rm(previous, { recursive: true, force: true });
    }
  } catch (error) {
    if (previousExists) {
      await rename(previous, outputDirectory);
    }
    throw error;
  } finally {
    await rm(swapRoot, { recursive: true, force: true });
  }
}

export async function generateIconSet(
  sourceUrl: URL,
  outputDirectoryUrl: URL,
  variant: IconVariant,
): Promise<GeneratedIconSet> {
  const outputDirectory = fileURLToPath(outputDirectoryUrl);
  const parent = dirname(outputDirectory);
  await mkdir(parent, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    join(parent, `.${basename(outputDirectory)}-generate-`),
  );

  try {
    const pngs = await renderPngs(sourceUrl, temporaryDirectory, variant);
    await writeIco(temporaryDirectory, pngs);
    await writeIcns(temporaryDirectory, pngs);
    await replaceDirectory(temporaryDirectory, outputDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  return { variant, files: GENERATED_FILES };
}

async function assertMatchingDirectory(
  expectedDirectoryUrl: URL,
  actualDirectoryUrl: URL,
): Promise<void> {
  const expectedNames = [...(await readdir(expectedDirectoryUrl))].sort();
  const actualNames = [...(await readdir(actualDirectoryUrl))].sort();
  if (
    expectedNames.length !== actualNames.length ||
    expectedNames.some((name, index) => name !== actualNames[index])
  ) {
    throw new Error('Icon file set does not match');
  }

  for (const name of expectedNames) {
    const expected = await readFile(new URL(name, expectedDirectoryUrl));
    const actual = await readFile(new URL(name, actualDirectoryUrl));
    if (!expected.equals(actual)) {
      throw new Error(`Icon bytes do not match: ${name}`);
    }
  }
}

export async function checkCommittedIcons(
  sourceUrl: URL,
  committedDirectoryUrl: URL,
): Promise<void> {
  const directory = await mkdtemp(join(dirname(fileURLToPath(committedDirectoryUrl)), '.icon-check-'));
  const generatedRootUrl = pathToFileURL(`${directory}/`);

  try {
    for (const variant of VARIANTS) {
      const generatedUrl = new URL(`${variant}/`, generatedRootUrl);
      await generateIconSet(sourceUrl, generatedUrl, variant);
      await assertMatchingDirectory(
        generatedUrl,
        new URL(`${variant}/`, committedDirectoryUrl),
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runCli(mode: IconGenerationMode): Promise<void> {
  const sourceUrl = new URL('source.svg', import.meta.url);
  const committedUrl = new URL('generated/', import.meta.url);

  if (mode === 'check') {
    await checkCommittedIcons(sourceUrl, committedUrl);
    return;
  }

  for (const variant of VARIANTS) {
    await generateIconSet(
      sourceUrl,
      new URL(`${variant}/`, committedUrl),
      variant,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode !== 'generate' && mode !== 'check') {
    process.stderr.write('Usage: generate.ts <generate|check>\n');
    process.exitCode = 1;
  } else {
    await runCli(mode);
  }
}

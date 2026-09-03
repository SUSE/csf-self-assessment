import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import sharp from 'sharp';

import {
  checkCommittedIcons,
  generateIconSet,
} from '../release/icons/generate.js';
import type { IconVariant } from '../release/icons/generate.js';

const DESKTOP_URL = new URL('../', import.meta.url);
const SOURCE_URL = new URL('release/icons/source.svg', DESKTOP_URL);
const COMMITTED_URL = new URL('release/icons/generated/', DESKTOP_URL);
const PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const EXPECTED_FILES = [
  ...PNG_SIZES.map((size) => `icon-${size}.png`),
  'icon.icns',
  'icon.ico',
];
const VARIANTS: readonly IconVariant[] = ['author', 'assessment'];

test('generated icon sets are complete, valid, distinct, and committed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-icons-'));
  const generatedRootUrl = pathToFileURL(`${directory}/`);

  try {
    for (const variant of VARIANTS) {
      const outputUrl = new URL(`${variant}/`, generatedRootUrl);
      const generated = await generateIconSet(SOURCE_URL, outputUrl, variant);
      assert.equal(generated.variant, variant);
      assert.deepEqual([...generated.files].sort(), [...EXPECTED_FILES].sort());

      for (const size of PNG_SIZES) {
        const file = `icon-${size}.png`;
        const bytes = await readFile(new URL(file, outputUrl));
        assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        const metadata = await sharp(bytes).metadata();
        assert.equal(metadata.width, size);
        assert.equal(metadata.height, size);
        assert.deepEqual(
          bytes,
          await readFile(new URL(`${variant}/${file}`, COMMITTED_URL)),
        );
      }

      const ico = await readFile(new URL('icon.ico', outputUrl));
      assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
      assert.deepEqual(
        ico,
        await readFile(new URL(`${variant}/icon.ico`, COMMITTED_URL)),
      );

      const icns = await readFile(new URL('icon.icns', outputUrl));
      assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
      assert.deepEqual(
        icns,
        await readFile(new URL(`${variant}/icon.icns`, COMMITTED_URL)),
      );
    }

    assert.notDeepEqual(
      await readFile(new URL('author/icon-512.png', generatedRootUrl)),
      await readFile(new URL('assessment/icon-512.png', generatedRootUrl)),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('committed icon checking rejects one changed byte', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'csf-icons-check-'));
  const generatedRootUrl = pathToFileURL(`${directory}/`);

  try {
    for (const variant of VARIANTS) {
      await generateIconSet(
        SOURCE_URL,
        new URL(`${variant}/`, generatedRootUrl),
        variant,
      );
    }
    await checkCommittedIcons(SOURCE_URL, generatedRootUrl);

    const changedUrl = new URL('author/icon-512.png', generatedRootUrl);
    const changed = await readFile(changedUrl);
    changed[changed.length - 1] = changed[changed.length - 1] === 0 ? 1 : 0;
    await writeFile(changedUrl, changed);

    await assert.rejects(checkCommittedIcons(SOURCE_URL, generatedRootUrl));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

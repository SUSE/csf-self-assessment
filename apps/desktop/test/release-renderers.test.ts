import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { z } from 'zod';

import { verifyCandidate } from '../release/evidence.js';

const CandidateDirectorySchema = z.string().min(1);
const RENDERERS: readonly { file: string; heading: string }[] = [
  { file: 'author.html', heading: 'No workbook' },
  { file: 'assessment.html', heading: 'Nothing loaded' },
];

test('release renderer files open offline from the exact candidate', async () => {
  const candidateDirectory = CandidateDirectorySchema.parse(
    process.env.CSF_RELEASE_CANDIDATE_DIRECTORY,
  );
  await verifyCandidate(candidateDirectory);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage();
    await page.route(/^https?:\/\// , async (route) => route.abort());

    for (const renderer of RENDERERS) {
      await page.goto(pathToFileURL(join(candidateDirectory, renderer.file)).href);
      const heading = page.getByRole('heading', { name: renderer.heading });
      await heading.waitFor({ state: 'visible' });
      assert.equal(await heading.isVisible(), true);
    }
  } finally {
    await browser?.close();
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from 'playwright';
import { z } from 'zod';

import {
  closeDesktop,
  DESKTOP_SMOKE_TARGETS,
  launchDesktop,
  withOpenDialogResult,
  withSaveDialogResult,
} from './electron-harness.js';
import type { DesktopSmokeTarget } from './electron-harness.js';

type DrivePalette = 'suse' | 'claymorphism';
type DriveMode = 'light' | 'dark';

const PALETTE_LABELS: Readonly<Record<DrivePalette, RegExp>> = {
  suse: /^SUSE/,
  claymorphism: /^Claymorphism/,
};
const THEME_COMBOS: readonly (readonly [DrivePalette, DriveMode])[] = [
  ['suse', 'light'],
  ['suse', 'dark'],
  ['claymorphism', 'light'],
  ['claymorphism', 'dark'],
];

const ASSESSMENT_WORKBOOK = fileURLToPath(
  new URL('../../../v2/csf-estate-workbook-assessment.json', import.meta.url),
);
const AUTHOR_WORKBOOK = fileURLToPath(
  new URL('../../../v2/csf-estate-workbook.json', import.meta.url),
);
const ALEX_PARTIAL = fileURLToPath(
  new URL('../../../v2/csf-estate-partial-Alex.json', import.meta.url),
);
const JANE_PARTIAL = fileURLToPath(
  new URL('../../../v2/csf-estate-partial-Jane.json', import.meta.url),
);

const RecommendationTitlesSchema = z.object({
  recommendations: z.array(z.object({ title: z.string().min(1) })).min(1),
});
const FinalAssessmentSchema = z.object({
  answers: z.array(z.unknown()).min(1),
});

const errors: string[] = [];

function collectErrors(page: Page, phase: string): void {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${phase}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`${phase}: ${error.message}`);
  });
}

function smokeTarget(entry: DesktopSmokeTarget['entry']): DesktopSmokeTarget {
  const target = DESKTOP_SMOKE_TARGETS.find((candidate) => candidate.entry === entry);
  if (target === undefined) {
    throw new Error(`No desktop smoke target for ${entry}`);
  }
  return target;
}

async function applyTheme(
  page: Page,
  palette: DrivePalette,
  mode: DriveMode,
): Promise<void> {
  const dark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  if (dark !== (mode === 'dark')) {
    await page.getByRole('button', { name: `Switch to ${mode} theme` }).click();
    await page.waitForFunction(
      (wanted) => document.documentElement.classList.contains('dark') === wanted,
      mode === 'dark',
    );
  }

  await page.getByRole('button', { name: 'Change colour palette' }).click();
  await page.getByRole('menuitemradio', { name: PALETTE_LABELS[palette] }).click();
  await page.waitForFunction(
    (wanted) =>
      document.documentElement.classList.contains('theme-claymorphism') === wanted,
    palette === 'claymorphism',
  );
}

async function sweepThemes(
  page: Page,
  outDir: string,
  checkpoint: string,
): Promise<void> {
  for (const [palette, mode] of THEME_COMBOS) {
    await applyTheme(page, palette, mode);
    await page.screenshot({
      path: join(outDir, `${checkpoint}-${palette}-${mode}.png`),
    });
  }
  await applyTheme(page, 'suse', 'light');
}

async function driveParticipant(outDir: string): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'csf-drive-participant-'));
  const launch = await launchDesktop(smokeTarget('assessment'), home);
  const { application, page } = launch;
  collectErrors(page, 'PARTICIPANT');
  try {
    await withOpenDialogResult(
      application,
      { canceled: false, filePaths: [ASSESSMENT_WORKBOOK] },
      async () => {
        await page
          .getByRole('main')
          .getByRole('button', { name: 'Load', exact: true })
          .click();
        const name = page.getByRole('textbox', { name: /^your name$/i });
        await name.fill('Ledger drive participant');
        await name.press('Enter');
      },
    );

    await page.getByRole('button', { name: 'Claims', exact: true }).click();
    await page.getByRole('button', { name: 'Add your first claim' }).click();
    for (const chip of ['Architecture', 'Compute', 'The institution']) {
      await page.locator('[data-slot=chip]', { hasText: chip }).first().click();
    }
    await page.getByRole('button', { name: 'Add claim', exact: true }).click();

    await page.getByRole('button', { name: 'All questions', exact: true }).click();
    await page.locator('[data-question="SOV-3.data-residency"]').click();
    await page.locator('[data-tray-chip]').first().click();
    await page.getByRole('radio').filter({ hasText: '2 Data Sovereignty' }).click();
    await page.getByRole('button', { name: 'Split into 4 strata' }).click();

    const place = async (chipKey: string, targetText: string): Promise<void> => {
      await page.locator(`[data-chip-key="${chipKey}"]`).first().click();
      await page.waitForTimeout(250);
      await page.getByRole('radio').filter({ hasText: targetText }).first().click();
      await page.waitForTimeout(500);
    };
    await place('compute:service', '3 Technological Sovereignty');
    await place('compute:software', 'Nobody knows');
    await place('compute:hardware', "Doesn't apply");
    await place('compute:chips', '0 No Sovereignty');

    await sweepThemes(page, outDir, 'fanout');

    const partialPath = join(outDir, 'partial.json');
    await withSaveDialogResult(
      application,
      {
        canceled: false,
        filePath: partialPath,
        suggestedName: 'csf-estate-partial-Ledger drive participant.json',
      },
      async () => {
        await page.getByRole('button', { name: 'Export partial' }).click();
        await page.waitForTimeout(1500);
      },
    );

    const written = await readFile(partialPath, 'utf8');
    JSON.parse(written);
    assert.ok(written.includes('Ledger drive participant'));
    assert.ok(written.includes('SOV-3.data-residency'));
    console.log('PHASE PARTICIPANT: OK');
  } finally {
    await closeDesktop(launch);
    await rm(home, { recursive: true, force: true });
  }
}

async function decideEveryClash(page: Page): Promise<void> {
  for (let guard = 0; guard < 200; guard += 1) {
    const open = page.locator('[data-clash-decided="false"]');
    if ((await open.count()) === 0) {
      break;
    }
    const card = open.first();
    const suggestion = card.locator('[data-suggestion]');
    if ((await suggestion.count()) > 0) {
      await suggestion.first().click();
    } else {
      await card.locator('[data-radio-group-item]').first().click();
    }
    await page.waitForTimeout(120);
  }
}

async function driveFacilitator(outDir: string): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'csf-drive-facilitator-'));
  const launch = await launchDesktop(smokeTarget('assessment'), home);
  const { application, page } = launch;
  collectErrors(page, 'FACILITATOR');
  try {
    await withOpenDialogResult(
      application,
      { canceled: false, filePaths: [AUTHOR_WORKBOOK] },
      async () => {
        await page
          .getByRole('main')
          .getByRole('button', { name: 'Load', exact: true })
          .click();
      },
    );

    for (const [partial, action] of [
      [ALEX_PARTIAL, 'Start merge'],
      [JANE_PARTIAL, 'Add partial'],
    ] as const) {
      await withOpenDialogResult(
        application,
        { canceled: false, filePaths: [partial] },
        async () => {
          await page.locator('header').getByLabel('Load', { exact: true }).click();
          await page
            .getByRole('alertdialog')
            .getByRole('button', { name: action, exact: true })
            .click();
        },
      );
      await page.waitForTimeout(2500);

      const pairs = page.locator('[data-party-pair]');
      const pairCount = await pairs.count();
      for (let index = 0; index < pairCount; index += 1) {
        await pairs.nth(index).locator('[data-radio-group-item]').first().click();
        await page.waitForTimeout(300);
      }
      await decideEveryClash(page);

      const land = page.getByRole('button', { name: 'Land', exact: true });
      assert.ok(await land.isEnabled(), `Land was disabled for ${action}`);
      await land.click();
      await page.waitForTimeout(2500);
    }

    await sweepThemes(page, outDir, 'merge');

    const finalPath = join(outDir, 'final.json');
    await withSaveDialogResult(
      application,
      {
        canceled: false,
        filePath: finalPath,
        suggestedName: 'csf-estate-finalized.json',
      },
      async () => {
        await page.getByLabel('Export final assessment', { exact: true }).click();
        await page.waitForTimeout(2000);
      },
    );

    FinalAssessmentSchema.parse(JSON.parse(await readFile(finalPath, 'utf8')));
    console.log('PHASE FACILITATOR: OK');
  } finally {
    await closeDesktop(launch);
    await rm(home, { recursive: true, force: true });
  }
}

async function driveAuthor(outDir: string): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), 'csf-drive-author-'));
  const launch = await launchDesktop(smokeTarget('author'), home);
  const { application, page } = launch;
  collectErrors(page, 'AUTHOR');
  try {
    await withOpenDialogResult(
      application,
      { canceled: false, filePaths: [AUTHOR_WORKBOOK] },
      async () => {
        await page.getByRole('button', { name: 'Import workbook' }).click();
      },
    );

    await page
      .getByRole('button', {
        name: 'Read a test estate on the dashboard',
        exact: true,
      })
      .click();
    const painted = page.locator('[data-heat-cell][data-painted=true]');
    await painted.first().waitFor();
    assert.ok((await painted.count()) > 0);
    await sweepThemes(page, outDir, 'dashboard');

    await page
      .getByRole('button', {
        name: 'Read the vendor page this estate produces',
        exact: true,
      })
      .click();
    const { recommendations } = RecommendationTitlesSchema.parse(
      JSON.parse(await readFile(AUTHOR_WORKBOOK, 'utf8')),
    );
    const [firstRecommendation] = recommendations;
    await page.getByText(firstRecommendation.title, { exact: false }).first().waitFor();
    await sweepThemes(page, outDir, 'recommendations');

    await page
      .getByRole('button', {
        name: 'Read the Report this estate prints',
        exact: true,
      })
      .click();
    await page.evaluate(() => {
      document.documentElement.dataset.printCalls = '0';
      window.print = () => {
        const current = Number(document.documentElement.dataset.printCalls ?? '0');
        document.documentElement.dataset.printCalls = String(current + 1);
      };
    });
    const beforePrint = await page.evaluate(() => ({
      title: document.title,
      dark: document.documentElement.classList.contains('dark'),
    }));
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    assert.deepEqual(
      await page.evaluate(() => ({
        calls: Number(document.documentElement.dataset.printCalls ?? '0'),
        title: document.title,
        dark: document.documentElement.classList.contains('dark'),
      })),
      { calls: 1, ...beforePrint },
    );
    await sweepThemes(page, outDir, 'report');
    console.log('PHASE AUTHOR: OK');
  } finally {
    await closeDesktop(launch);
    await rm(home, { recursive: true, force: true });
  }
}

const outDir =
  process.argv[2] ?? (await mkdtemp(join(tmpdir(), 'csf-ledger-drive-')));
console.log(`DRIVE-OUT: ${outDir}`);

await driveParticipant(outDir);
await driveFacilitator(outDir);
await driveAuthor(outDir);

for (const line of errors) {
  console.log(line);
}
console.log(`CONSOLE-ERRORS: ${errors.length}`);
if (errors.length > 0) {
  process.exitCode = 1;
}

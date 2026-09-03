import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  offenders,
  SCAN_ROOTS,
  scannedFiles,
  type LineEntry,
  type ScanEntry,
} from './source-scan';

// Theme-fidelity guard. Every palette (SUSE + the imported shadcnblocks ones)
// works only because components read MAPPED TOKENS and nothing else — a raw hex,
// an `rgb()`, or a Tailwind palette utility like `text-amber-700` is frozen at one
// colour and silently ignores the selected palette. That is invisible in the
// default palette, which is exactly why it needs a test rather than review.
//
// This is a whole-source scan, not a per-component assertion, because the
// invariant is repo-wide: the analytics tiles and the hand-drawn SVG views (the
// wheels, the exposure map, the heat grids) are the places it matters most, and
// they are also the places where a one-off colour is most tempting.
//
// The walker itself lives in `source-scan.ts`. This file is the table: one
// entry per banned thing, each naming the fix a developer should reach for.

const TAILWIND_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber',
  'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
].join('|');

// A colour function composed FROM tokens follows the palette and is fine —
// `color-mix(in oklab, var(--primary) 45%, transparent)` is the canonical way to
// tint a token in a <style> block. Only literal arguments freeze a colour, so a
// line that references a token is exempt from the colour-function rule.
const COMPOSED_FROM_TOKEN = /var\(--/;

const BANNED: readonly ScanEntry[] = [
  {
    kind: 'line',
    what: 'a hex colour',
    pattern: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/,
    exempt: null,
    instead: 'a semantic token utility (bg-card, text-muted-foreground, …)',
    scope: { kind: 'everywhere' },
  },
  {
    kind: 'line',
    what: 'a raw colour function',
    // Literal oklch()/rgb()/hsl() belong in theme.css, where tokens are declared.
    pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/,
    exempt: COMPOSED_FROM_TOKEN,
    instead: 'a token declared in ui/theme.css, or color-mix() over a var(--token)',
    scope: { kind: 'everywhere' },
  },
  {
    kind: 'line',
    what: 'a Tailwind palette utility',
    // e.g. text-amber-700, bg-zinc-800/50, dark:fill-red-500 — frozen colours
    // that cannot follow the selected palette.
    pattern: new RegExp(
      `\\b(?:bg|text|border|fill|stroke|ring|outline|from|via|to|decoration|accent|caret|divide|shadow)-(?:${TAILWIND_PALETTE})-(?:50|[1-9]00|950)\\b`,
    ),
    exempt: null,
    instead: 'the matching semantic token (text-warning-ink, text-destructive, …)',
    scope: { kind: 'everywhere' },
  },
  {
    kind: 'line',
    what: 'a raw form control',
    pattern: /<(?:input|select|textarea)(?=\s|$)/,
    exempt: null,
    instead:
      'the styled primitive — Input, Select or Textarea from ui/forms, Checkbox from ui/checkbox',
    scope: { kind: 'paths-except', match: /\.svelte$/, except: /ui\/forms\// },
  },
  {
    kind: 'line',
    what: 'an arbitrary type size',
    // Every register the interface uses has a token (DESIGN.md Hierarchy,
    // spec §2.5). A bracket size is frozen outside the scale and invisible to
    // a reader auditing the ramp. Sizes only — `border-[…]`, `rounded-[…]`,
    // `max-w-[…]` and `in-data-[…]` are out of scope (spec §8).
    pattern: /\btext-\[[^\]]+\]/,
    exempt: null,
    instead:
      'a named size token — text-reading, text-2xs, text-3xs, or the Tailwind scale (text-xs … text-3xl)',
    scope: { kind: 'everywhere' },
  },
  {
    kind: 'line',
    what: 'text set in the amber fill token',
    // `--warning` is a FILL: at L 0.76 it measures 1.95:1 on a light well, so
    // amber text set in it is unreadable in light mode at any size. The ink case
    // shipped and was never adopted. Spec docs/specs/quality.md §2.6, invariant 8.
    // The lookahead is load-bearing: `text-warning-ink` and
    // `text-warning-foreground` are both correct and both start with this prefix.
    pattern: /\btext-warning(?!-)/,
    exempt: null,
    instead:
      'text-warning-ink for text; bg-warning or border-warning for a fill or an edge',
    scope: { kind: 'everywhere' },
  },
  {
    kind: 'size',
    what: 'a source file past the 500-line cap',
    maxLines: 500,
    instead:
      'decompose it by responsibility into named modules the barrel re-exports — a file needing "and" to describe holds more than one job (spec §6 invariant 6)',
    // Source only: a characterization suite is a table of locked numbers and
    // splitting a table hides the oracle (spec §7, rule 11 divergence).
    scope: { kind: 'paths-except', match: /\.(svelte|ts)$/, except: /\.test\.ts$/ },
  },
];

function entryFor(what: string): ScanEntry {
  const entry = BANNED.find((candidate) => candidate.what === what);
  if (!entry) throw new Error(`no scan entry named ${what}`);
  return entry;
}

function lineEntryFor(what: string): LineEntry {
  const entry = entryFor(what);
  if (entry.kind !== 'line') throw new Error(`scan entry ${what} is not a line rule`);
  return entry;
}

describe('theme fidelity', () => {
  const files = scannedFiles(SCAN_ROOTS);

  it('scans every root', () => {
    // A guard that silently scanned nothing would pass forever.
    expect(files.length).toBeGreaterThan(100);
  });

  it('every imported palette derives its own attention amber', () => {
    // The amber marks "a decision is owed here" (the placement tray, the evidence
    // nudge, the answer hatch, the what's-left field). It used to be declared once
    // at :root and inherited, which meant switching palette moved every colour on
    // screen EXCEPT the one the reader is being asked to act on — SUSE's amber sat
    // on Supabase's greys. Each imported block now derives L and C from its own
    // --primary at the fixed amber hue, and the failure mode is silent: a
    // re-vendored palette that drops the line simply inherits again and looks
    // plausible. Hence a test rather than review.
    const css = readFileSync(fileURLToPath(new URL('../theme.css', import.meta.url)), 'utf8');
    const derived = /--warning:\s*oklch\(from var\(--primary\)[^;]*\s70\)/;
    const offending = ['claymorphism', 'cleanslate', 'modern-minimal', 'supabase'].filter(
      (palette) => {
        const block = new RegExp(`\\.theme-${palette}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? '';
        return !derived.test(block);
      },
    );
    expect(offending, 'palettes inheriting the SUSE amber instead of deriving one').toEqual([]);
  });

  it('the type scale declares a token for every register the interface uses', () => {
    // DESIGN.md's Hierarchy names three registers Tailwind's default scale has no
    // step for. Without a token an author reaches for `text-[11px]`, which is
    // frozen outside the ramp. Spec docs/specs/quality.md §2.5.
    const css = readFileSync(fileURLToPath(new URL('../theme.css', import.meta.url)), 'utf8');
    const block = /@theme\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    const expected: readonly [string, RegExp][] = [
      ['--text-reading: 0.9375rem', /--text-reading:\s*0\.9375rem\s*;/],
      ['--text-reading--line-height: 1.625', /--text-reading--line-height:\s*1\.625\s*;/],
      ['--text-2xs: 0.6875rem', /--text-2xs:\s*0\.6875rem\s*;/],
      ['--text-2xs--line-height: 1rem', /--text-2xs--line-height:\s*1rem\s*;/],
      ['--text-3xs: 0.625rem', /--text-3xs:\s*0\.625rem\s*;/],
      ['--text-3xs--line-height: 0.875rem', /--text-3xs--line-height:\s*0\.875rem\s*;/],
    ];
    const missing = expected.filter(([, pattern]) => !pattern.test(block)).map(([name]) => name);
    expect(missing, 'declare it in @theme — spec §2.5').toEqual([]);
  });

  it('readable links and affirmative labels use their dedicated semantic tokens', () => {
    const offending: string[] = [];
    for (const file of files) {
      file.text.split('\n').forEach((line, i) => {
        if (!line.includes('text-primary') || line.trimStart().startsWith('//') || line.includes('<!--')) return;
        if (/(?:link:|underline|Complete|positive:|<span[^>]+text-primary)/i.test(line)) {
          offending.push(`${file.path}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offending, 'use text-link or text-positive instead').toEqual([]);
  });

  it('the arbitrary type-size pattern catches a bracket size and pardons every other bracket utility', () => {
    const { pattern } = lineEntryFor('an arbitrary type size');
    const sizes = [
      'class="text-[11px]"',
      'class="text-[0.65rem]"',
      'class="font-mono text-[10px] text-muted-foreground"',
      "'ml-auto text-[11px]'",
      'text-[15px] leading-relaxed',
      "tick: 'size-6 text-[10px] leading-none'",
    ];
    const pardoned = [
      'class="text-2xs"',
      'class="text-reading"',
      'class="text-3xs"',
      'class="border-[1.5px]"',
      'class="max-w-[72ch] text-sm"',
      'rounded-[min(var(--radius-md),12px)] px-2.5',
      'in-data-[slot=button-group]:rounded-lg',
    ];
    expect(sizes.filter((line) => !pattern.test(line)), 'a bracket size must be caught').toEqual([]);
    expect(pardoned.filter((line) => pattern.test(line)), 'only sizes — spec §8').toEqual([]);
  });

  it('the amber-text pattern catches the fill token and pardons the ink and the on-fill cases', () => {
    const { pattern } = lineEntryFor('text set in the amber fill token');
    const caught = [
      'class="text-warning"',
      'class="text-xs text-warning"',
      '<span class="text-warning">⚑</span>',
      "attention: 'border-warning/40 bg-warning/10 font-medium text-warning',",
      "return 'text-warning';",
      'class="hover:text-warning"',
    ];
    const pardoned = [
      "advise: 'text-warning-ink',",
      'class="text-xs text-warning-ink"',
      'class="bg-warning text-warning-foreground"',
      'class="bg-warning/10"',
      'class="border-warning/40"',
    ];
    expect(caught.filter((line) => !pattern.test(line)), 'amber text must be caught').toEqual([]);
    expect(
      pardoned.filter((line) => pattern.test(line)),
      'the ink, the on-fill and the fill cases are correct',
    ).toEqual([]);
  });

  for (const entry of BANNED.filter((entry) => entry.kind === 'line')) {
    it(`no component hardcodes ${entry.what}`, () => {
      expect(offenders(files, entry), `use ${entry.instead} instead`).toEqual([]);
    });
  }

  it('no source file exceeds the 500-line cap', () => {
    const entry = entryFor('a source file past the 500-line cap');
    expect(offenders(files, entry), entry.instead).toEqual([]);
  });
});

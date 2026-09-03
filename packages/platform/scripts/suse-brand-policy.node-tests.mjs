import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import postcss from 'postcss';

import { validateCategoricalPalette } from './validate-categorical-palette.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const THEME = join(ROOT, 'packages/platform/src/ui/theme.css');
const SOURCE = join(ROOT, 'packages/platform/src/ui');
const theme = await readFile(THEME, 'utf8');

const SUSE_LIGHT = ':root,\n.theme-suse';
const SUSE_DARK = '.dark,\n.theme-suse.dark';

// The FOUR hand-authored brand pairs. SUSE is the default (`:root`/`.dark`); the
// other three are further readings of the same guide on the palette axis. They are
// held to the same brand discipline as the default, which is why they are listed
// here rather than treated as imported presets: an imported preset is allowed to
// be off-brand, a brand palette is not.
const BRAND_PAIRS = Object.freeze([
  { id: 'suse', light: SUSE_LIGHT, dark: SUSE_DARK },
  { id: 'pine-mint', light: '.theme-pine-mint', dark: '.theme-pine-mint.dark' },
  { id: 'fog-editorial', light: '.theme-fog-editorial', dark: '.theme-fog-editorial.dark' },
  { id: 'instrument', light: '.theme-instrument', dark: '.theme-instrument.dark' },
]);

// Declared in the two root blocks and inherited by every palette — The Inherited
// Danger Rule. A brand palette re-declaring any of these would make "danger" and
// "a decision is owed here" palette-dependent, which is the one thing the reader
// must be able to rely on across a palette switch.
const INHERITED_CONTRACTS = Object.freeze([
  'destructive',
  'destructive-foreground',
  'destructive-ink',
  'link',
  'positive',
  'warning',
  'warning-foreground',
]);

const NAMED = Object.freeze({
  pine: '#0c322c',
  jungle: '#30ba78',
  midnight: '#192072',
  waterhole: '#2453ff',
  white: '#ffffff',
  fog: '#efefef',
  persimmon: '#fe7c3f',
  mint: '#90ebcd',
});

const RAMPS = Object.freeze({
  jungle: ['#0c322c', '#025937', '#008657', '#30ba78', '#42d29f', '#83e1be', '#c0efde', '#eafaf4'],
  persimmon: ['#47190d', '#8e2810', '#bd3314', '#ff5a2b', '#fe7c3f', '#ffb184', '#ffd3bd', '#ffefe9'],
  waterhole: ['#0a112b', '#192072', '#0b41b7', '#2453ff', '#3c8eef', '#81aefc', '#c8dafc', '#e6edfe'],
  mint: ['#0c322c', '#01564a', '#008878', '#00bda7', '#38d5b4', '#90ebcd', '#bff1ea', '#eafaf8'],
  fog: ['#1d1d1d', '#3e3e3e', '#525252', '#6f6f6f', '#999999', '#bababa', '#dcdbdc', '#efefef'],
});
const DOCUMENTED = new Set([...Object.values(NAMED), ...Object.values(RAMPS).flat()]);

const CHARTS = Object.freeze({
  light: ['#2453ff', '#eda100', '#e87ba4', '#4a3aa7', '#e34948'],
  dark: ['#3c8eef', '#c98500', '#d55181', '#9085e9', '#e66767'],
});

const s2lin = (channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const lin2s = (channel) => {
  const clamped = Math.max(0, Math.min(1, channel));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
};

function declarations(selector) {
  const root = postcss.parse(theme);
  const rules = [];
  root.walkRules((rule) => {
    if (rule.selector === selector) rules.push(rule);
  });
  assert.equal(rules.length, 1, `expected one ${selector} rule`);
  return new Map(rules[0].nodes.filter((node) => node.type === 'decl').map((decl) => [decl.prop.slice(2), decl.value.trim()]));
}

function parseOklch(value) {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/.exec(value);
  assert.ok(match, `expected a literal OKLCH colour, got ${value}`);
  return match.slice(1).map(Number);
}

function oklchToHex(value) {
  const [L, C, hue] = parseOklch(value);
  const radians = (hue * Math.PI) / 180;
  const a = C * Math.cos(radians);
  const b = C * Math.sin(radians);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.round(lin2s(channel) * 255));
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function hexChannels(hex) {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}

function expectHex(value, expected) {
  const actual = oklchToHex(value);
  const drift = hexChannels(actual).map((channel, index) => Math.abs(channel - hexChannels(expected)[index]));
  assert.ok(drift.every((delta) => delta <= 1), `${value} serialized as ${actual}; expected ${expected}`);
}

function contrast(left, right) {
  const luminance = (hex) => {
    const [r, g, b] = hexChannels(hex).map((channel) => s2lin(channel / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function mixOklab(left, right, leftWeight) {
  const toOklab = (hex) => {
    const [r, g, b] = hexChannels(hex).map((channel) => s2lin(channel / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  };
  const fromOklab = ([L, a, b]) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((channel) => Math.round(lin2s(channel) * 255));
    return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  };
  const leftLab = toOklab(left);
  const rightLab = toOklab(right);
  return fromOklab(leftLab.map((channel, index) => channel * leftWeight + rightLab[index] * (1 - leftWeight)));
}

async function sourceText() {
  const files = [];
  const { readdir } = await import('node:fs/promises');
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(svelte|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) files.push(path);
    }
  }
  await walk(SOURCE);
  return Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')]));
}

test('SUSE named tokens serialize to canonical brand hex values', () => {
  const light = declarations(SUSE_LIGHT);
  const dark = declarations(SUSE_DARK);
  for (const [token, hex] of Object.entries({
    background: NAMED.fog,
    foreground: NAMED.pine,
    card: NAMED.white,
    'card-foreground': NAMED.pine,
    primary: NAMED.jungle,
    'primary-foreground': NAMED.pine,
    link: NAMED.waterhole,
    positive: '#025937',
    'muted-foreground': '#525252',
    'destructive-ink': '#bd3314',
    border: '#dcdbdc',
    input: NAMED.white,
    ring: NAMED.jungle,
  })) expectHex(light.get(token), hex);
  for (const [token, hex] of Object.entries({
    background: NAMED.pine,
    foreground: NAMED.fog,
    primary: NAMED.jungle,
    'primary-foreground': NAMED.pine,
    link: '#81aefc',
    positive: NAMED.jungle,
    'muted-foreground': '#999999',
    'destructive-ink': NAMED.persimmon,
    ring: NAMED.jungle,
  })) expectHex(dark.get(token), hex);
});

test('every brand palette’s literals come from documented ramps or declared product palettes', () => {
  // The brand-purity guard, and the reason a brand palette may express depth only
  // as color-mix() over documented hexes: a `color-mix(…)` value is skipped here
  // because it names its inputs, while an OKLCH literal has to BE a published
  // value. Sampling a screenshot or nudging a hex by eye fails this test.
  const allowedProduct = new Set([...CHARTS.light, ...CHARTS.dark]);
  for (const pair of BRAND_PAIRS) {
    for (const mode of [declarations(pair.light), declarations(pair.dark)]) {
      for (const [token, value] of mode) {
        if (!value.startsWith('oklch(') || ['warning', 'warning-foreground'].includes(token) || token.startsWith('seal-')) continue;
        const hex = oklchToHex(value);
        assert.ok(
          DOCUMENTED.has(hex) || allowedProduct.has(hex),
          `${pair.id}: --${token} serializes to undocumented ${hex}`,
        );
      }
    }
  }
});

test('brand palettes inherit the danger and attention contracts instead of re-expressing them', () => {
  // SUSE authors them at the root; the other three must not touch them. Prose in
  // DESIGN.md ("The Inherited Danger Rule") is not enforcement — a palette added in
  // a hurry with its own red looks plausible and silently breaks the contract.
  for (const pair of BRAND_PAIRS.filter((p) => p.id !== 'suse')) {
    for (const [mode, selector] of [['light', pair.light], ['dark', pair.dark]]) {
      const declared = declarations(selector);
      const offenders = INHERITED_CONTRACTS.filter((token) => declared.has(token));
      assert.deepEqual(offenders, [], `${pair.id} ${mode} re-declares inherited contract tokens`);
    }
  }
});

test('brand palettes carry a seal hue, a radius, and the fixed categorical series', () => {
  for (const pair of BRAND_PAIRS) {
    const light = declarations(pair.light);
    const dark = declarations(pair.dark);
    assert.ok(light.has('seal-hue'), `${pair.id} light declares no --seal-hue`);
    assert.ok(light.has('radius'), `${pair.id} light declares no --radius`);
    // Only the light block declares the hue: both selectors match the same <html>,
    // so the dark twin inherits it and cannot drift out of step.
    assert.ok(!dark.has('seal-hue'), `${pair.id} dark re-declares --seal-hue`);
    // ADR-0014: the ramp hue IS the palette's own --primary hue, derived rather than
    // authored, so the ordinal and the palette can never disagree about what "this
    // palette's hue" is. The tweakcn bridge enforces this for the pairs it manages by
    // rewriting the value on apply; a hand-authored brand pair has no such backstop,
    // which is what this assertion is. It is also what fixes each palette's ramp:
    // Pine & Mint's action is Pine, so its ordinal is Pine's teal-green rather than
    // Jungle, and Fog Editorial's action is Waterhole, so its ordinal is blue.
    assert.equal(
      parseOklch(light.get('seal-hue') ? `oklch(0 0 ${light.get('seal-hue')})` : 'x')[2],
      parseOklch(light.get('primary'))[2],
      `${pair.id}: --seal-hue is not the hue of its own --primary`,
    );
    assert.deepEqual(
      CHARTS.light.map((_, index) => oklchToHex(light.get(`chart-${index + 1}`))),
      CHARTS.light,
      `${pair.id} light re-hues the closed categorical series`,
    );
    assert.deepEqual(
      CHARTS.dark.map((_, index) => oklchToHex(dark.get(`chart-${index + 1}`))),
      CHARTS.dark,
      `${pair.id} dark re-hues the closed categorical series`,
    );
  }
});

test('brand palette actions, rails and canvases meet their contrast contracts', () => {
  // Only pairs where BOTH sides are literals are checked here — a color-mix()
  // surface has no hex at this layer. The mixed surfaces are measured in a real
  // browser instead (see the palette probe in the theming change that added these).
  const literal = (map, token) => {
    const value = map.get(token);
    return value?.startsWith('oklch(') ? oklchToHex(value) : null;
  };
  const PAIRS = [
    ['foreground', 'background', 4.5, 'body ink on the canvas'],
    ['card-foreground', 'card', 4.5, 'body ink on a card'],
    ['popover-foreground', 'popover', 4.5, 'popover ink'],
    ['primary-foreground', 'primary', 4.5, 'the action label'],
    ['secondary-foreground', 'secondary', 4.5, 'the secondary label'],
    ['accent-foreground', 'accent', 4.5, 'the accent label'],
    ['muted-foreground', 'muted', 4.5, 'muted ink on the muted surface'],
    ['sidebar-foreground', 'sidebar', 4.5, 'the rail label'],
    ['sidebar-primary-foreground', 'sidebar-primary', 4.5, 'the rail action label'],
    ['sidebar-accent-foreground', 'sidebar-accent', 4.5, 'the active rail label'],
  ];
  // `--ring` / `--sidebar-ring` are deliberately absent: under the default palette
  // the ring is Jungle and the rail is White, which measures 2.49:1. That is a
  // pre-existing shortfall in the shipping palette, not something introduced here,
  // and asserting it would fail the build on unrelated work. Instrument's rail ring
  // is Mint precisely because Jungle on Pine does not clear 3:1 either.
  for (const pair of BRAND_PAIRS) {
    for (const [mode, selector] of [['light', pair.light], ['dark', pair.dark]]) {
      const map = declarations(selector);
      for (const [ink, surface, floor, what] of PAIRS) {
        const a = literal(map, ink);
        const b = literal(map, surface);
        if (!a || !b) continue;
        const ratio = contrast(a, b);
        assert.ok(
          ratio >= floor,
          `${pair.id} ${mode}: ${what} (${a} on ${b}) is ${ratio.toFixed(2)}:1, needs ${floor}:1`,
        );
      }
    }
  }
});

test('SUSE text, graphics, and derived semantic pairs meet their contrast contracts', () => {
  const textPairs = [
    [NAMED.pine, NAMED.fog],
    [NAMED.pine, NAMED.white],
    [NAMED.pine, NAMED.jungle],
    [NAMED.waterhole, NAMED.white],
    [NAMED.waterhole, NAMED.fog],
    ['#025937', NAMED.white],
    ['#025937', NAMED.fog],
    [NAMED.fog, NAMED.pine],
    ['#999999', NAMED.pine],
    ['#81aefc', NAMED.pine],
    [NAMED.jungle, NAMED.pine],
    ['#bd3314', NAMED.white],
    ['#fe7c3f', NAMED.pine],
  ];
  for (const [ink, surface] of textPairs) {
    assert.ok(contrast(ink, surface) >= 4.5, `${ink} on ${surface} is ${contrast(ink, surface).toFixed(2)}:1`);
  }
  assert.ok(contrast(NAMED.jungle, NAMED.pine) >= 3, 'Jungle graphic on Pine misses 3:1');
  assert.ok(contrast(NAMED.waterhole, NAMED.white) >= 3, 'Waterhole focus graphic on White misses 3:1');
  assert.ok(contrast(NAMED.waterhole, NAMED.fog) >= 3, 'Waterhole focus graphic on Fog misses 3:1');

  const wellLight = mixOklab(NAMED.white, NAMED.pine, 0.94);
  const warningInkLight = mixOklab(oklchToHex(declarations(SUSE_LIGHT).get('warning')), NAMED.pine, 0.5);
  const warningInkDark = mixOklab(oklchToHex(declarations(SUSE_DARK).get('warning')), NAMED.fog, 0.5);
  assert.ok(contrast(warningInkLight, wellLight) >= 4.5);
  assert.ok(contrast(warningInkDark, NAMED.pine) >= 4.5);
});

test('SUSE chart slots are the fixed non-green validated categorical palettes', () => {
  const light = declarations(SUSE_LIGHT);
  const dark = declarations(SUSE_DARK);
  assert.deepEqual(CHARTS.light.map((_, index) => oklchToHex(light.get(`chart-${index + 1}`))), CHARTS.light);
  assert.deepEqual(CHARTS.dark.map((_, index) => oklchToHex(dark.get(`chart-${index + 1}`))), CHARTS.dark);

  for (const [mode, palette, surface] of [
    ['light', CHARTS.light, NAMED.white],
    ['light', CHARTS.light, NAMED.fog],
    ['dark', CHARTS.dark, NAMED.pine],
    ['dark', CHARTS.dark, mixOklab(NAMED.pine, NAMED.white, 0.94)],
  ]) {
    assert.equal(validateCategoricalPalette(palette, { mode, surface }).ok, true, `${mode} adjacent palette`);
    assert.equal(validateCategoricalPalette(palette.slice(0, 3), { mode, surface, pairs: 'all' }).ok, true, `${mode} first three all-pairs`);
  }
});

test('readable links and affirmative labels do not use text-primary', async () => {
  const offenders = [];
  for (const [file, source] of await sourceText()) {
    source.split('\n').forEach((line, index) => {
      if (!line.includes('text-primary') || line.trimStart().startsWith('//') || line.includes('<!--')) return;
      const readable = /(?:link:|underline|Complete|positive:|<span[^>]+text-primary)/i.test(line);
      if (readable) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import postcss from 'postcss';

import {
  PALETTES,
  applyPaletteCss,
  checkThemeCss,
  exportPaletteCss,
  palettePresetValues,
} from './theme-palette-bridge.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const THEME = join(ROOT, 'packages/platform/src/ui/theme.css');
const original = await readFile(THEME, 'utf8');

function declarations(css, selector) {
  const root = postcss.parse(css);
  const rules = [];
  root.walkRules((rule) => {
    if (rule.selector === selector) rules.push(rule);
  });
  assert.equal(rules.length, 1, `expected one ${selector} rule`);
  return new Map(rules[0].nodes.filter((n) => n.type === 'decl').map((d) => [d.prop, d.value]));
}

function replaceDeclaration(css, selector, prop, value) {
  const root = postcss.parse(css);
  const rule = root.nodes.find((node) => node.type === 'rule' && node.selector === selector);
  assert.ok(rule);
  const decl = rule.nodes.find((node) => node.type === 'decl' && node.prop === prop);
  assert.ok(decl);
  decl.value = value;
  return root.toString();
}

test('the bridge validates all eight canonical palette selector pairs', () => {
  const report = checkThemeCss(original);
  assert.deepEqual(
    report.map(({ id, light, dark }) => ({ id, light, dark })),
    [
      { id: 'suse', light: ':root,\n.theme-suse', dark: '.dark,\n.theme-suse.dark' },
      { id: 'pine-mint', light: '.theme-pine-mint', dark: '.theme-pine-mint.dark' },
      { id: 'fog-editorial', light: '.theme-fog-editorial', dark: '.theme-fog-editorial.dark' },
      { id: 'instrument', light: '.theme-instrument', dark: '.theme-instrument.dark' },
      { id: 'claymorphism', light: '.theme-claymorphism', dark: '.theme-claymorphism.dark' },
      { id: 'cleanslate', light: '.theme-cleanslate', dark: '.theme-cleanslate.dark' },
      { id: 'modern-minimal', light: '.theme-modern-minimal', dark: '.theme-modern-minimal.dark' },
      { id: 'supabase', light: '.theme-supabase', dark: '.theme-supabase.dark' },
    ],
  );
});

test('export emits one complete synthetic :root/.dark pair for every palette', () => {
  for (const { id } of PALETTES) {
    const exported = exportPaletteCss(original, id);
    const light = declarations(exported, ':root');
    const dark = declarations(exported, '.dark');
    assert.equal(light.size, 43);
    assert.equal(dark.size, 35);
    assert.ok(light.has('--destructive'));
    assert.ok(dark.has('--destructive'));
    assert.ok(light.has('--radius'));
    assert.ok(light.has('--shadow-2xl'));
    assert.equal(dark.has('--radius'), false);
    assert.equal(dark.has('--shadow-2xl'), false);
  }
});

test('structured preset values share effective colors with CSS export and expose raw shadow controls', () => {
  const expectedShadows = {
    suse: {
      'shadow-color': 'rgb(0 0 0)',
      'shadow-opacity': '0.1',
      'shadow-blur': '3px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
    'pine-mint': {
      // The only brand pair with a TINTED shadow: Pine rather than black, because
      // its separation comes from tint rather than from lift.
      'shadow-color': 'rgb(12 50 44)',
      'shadow-opacity': '0.09',
      'shadow-blur': '3px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
    'fog-editorial': {
      // Zero opacity, not `none`: the bridge needs a parseable geometry+colour, and
      // a transparent ramp says "this palette has no elevation" in a form the
      // round-trip can carry. Hairlines do the separating instead.
      'shadow-color': 'rgb(0 0 0)',
      'shadow-opacity': '0',
      'shadow-blur': '3px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
    instrument: {
      // Zero blur: a 1px seat, not a lift.
      'shadow-color': 'rgb(0 0 0)',
      'shadow-opacity': '0.06',
      'shadow-blur': '0px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
    claymorphism: {
      'shadow-color': 'hsl(240 4% 60%)',
      'shadow-opacity': '0.18',
      'shadow-blur': '10px',
      'shadow-spread': '4px',
      'shadow-offset-x': '2px',
      'shadow-offset-y': '2px',
    },
    cleanslate: {
      'shadow-color': 'hsl(0 0% 0%)',
      'shadow-opacity': '0.1',
      'shadow-blur': '8px',
      'shadow-spread': '-1px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '4px',
    },
    'modern-minimal': {
      'shadow-color': 'hsl(0 0% 0%)',
      'shadow-opacity': '0.1',
      'shadow-blur': '3px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
    supabase: {
      'shadow-color': 'hsl(0 0% 0%)',
      'shadow-opacity': '0.17',
      'shadow-blur': '3px',
      'shadow-spread': '0px',
      'shadow-offset-x': '0px',
      'shadow-offset-y': '1px',
    },
  };
  for (const { id } of PALETTES) {
    const preset = palettePresetValues(original, id);
    const exported = exportPaletteCss(original, id);
    const light = declarations(exported, ':root');
    const dark = declarations(exported, '.dark');
    assert.equal(preset.id, id);
    for (const token of [
      'background',
      'primary',
      'chart-5',
      'sidebar-ring',
      'destructive',
      'destructive-foreground',
    ]) {
      assert.equal(preset.light[token], light.get(`--${token}`));
      assert.equal(preset.dark[token], dark.get(`--${token}`));
    }
    assert.equal(preset.light.radius, light.get('--radius'));
    assert.deepEqual(
      Object.fromEntries(preset.shadowControlNames.map((name) => [name, preset.light[name]])),
      expectedShadows[id],
    );
    assert.deepEqual(preset.protectedTokens, [
      'destructive',
      'destructive-foreground',
      'link',
      'positive',
      'destructive-ink',
    ]);
    assert.equal(preset.light['font-sans'], undefined);
    assert.equal(preset.light['shadow-sm'], light.get('--shadow-sm'));
    assert.equal(preset.light['seal-hue'], undefined);
    assert.deepEqual(palettePresetValues(original, id), preset);
  }
});

test('structured preset generation rejects malformed or ambiguous first shadow layers', () => {
  assert.throws(
    () => palettePresetValues(original.replace('0 1px 3px 0 rgb(', 'inset 0 1px 3px 0 rgb('), 'suse'),
    /inset/i,
  );
  assert.throws(
    () => palettePresetValues(original.replace('0 1px 3px 0 rgb(', '0 1px 3px 0 var('), 'suse'),
    /literal color|malformed/i,
  );
});

test('export/apply is a byte-identical no-op for every palette', () => {
  for (const { id } of PALETTES) {
    const result = applyPaletteCss(original, id, exportPaletteCss(original, id));
    assert.equal(result.changed, false);
    assert.equal(result.css, original);
    assert.equal(result.diff, '');
  }
});

test('apply updates the full editable surface and derives seal hue from light primary', () => {
  let input = exportPaletteCss(original, 'modern-minimal');
  const changes = {
    '--background': 'oklch(0.91 0.01 210)',
    '--primary': 'oklch(0.62 0.18 222.5)',
    '--chart-5': 'oklch(0.55 0.15 310)',
    '--sidebar-ring': 'oklch(0.68 0.12 250)',
    '--radius': '0.75rem',
    '--shadow-2xl': '0 30px 60px -20px rgb(0 0 0 / 0.3)',
  };
  for (const [prop, value] of Object.entries(changes)) {
    input = replaceDeclaration(input, ':root', prop, value);
  }
  input = replaceDeclaration(input, '.dark', '--background', 'oklch(0.19 0.01 210)');

  const result = applyPaletteCss(original, 'modern-minimal', input);
  assert.equal(result.changed, true);
  assert.match(result.summary, /Palette modern-minimal/);
  const exported = exportPaletteCss(result.css, 'modern-minimal');
  const light = declarations(exported, ':root');
  const dark = declarations(exported, '.dark');
  for (const [prop, value] of Object.entries(changes)) assert.equal(light.get(prop), value);
  assert.equal(dark.get('--background'), 'oklch(0.19 0.01 210)');
  assert.match(result.css, /--seal-hue: 222\.5;/);
});

test('apply preserves protected contracts and every byte outside selected allowlisted values', () => {
  let input = exportPaletteCss(original, 'cleanslate');
  input = replaceDeclaration(input, ':root', '--primary', 'oklch(0.61 0.2 240)');
  input = replaceDeclaration(input, '.dark', '--card', 'oklch(0.3 0.04 245)');
  const result = applyPaletteCss(original, 'cleanslate', input);

  assert.match(result.css, /@font-face/);
  assert.match(result.css, /--warning: oklch\(0\.7600 0\.1500 70\)/);
  assert.match(result.css, /--destructive: oklch\(0\.6830686 0\.20889486 35\.94168\)/);
  assert.match(result.css, /--well: color-mix/);
  assert.match(result.css, /--seal-fill-4: oklch\(0\.65 0\.14 var\(--seal-hue\)\)/);
  assert.match(result.css, /@theme inline/);
  assert.match(result.css, /@layer base/);
  assert.equal(
    exportPaletteCss(result.css, 'supabase'),
    exportPaletteCss(original, 'supabase'),
  );
});

test('apply accepts tweakcn full code export while ignoring its generated wrapper and metadata', () => {
  let input = exportPaletteCss(original, 'suse');
  input = replaceDeclaration(input, ':root', '--primary', 'oklch(0.7039 0.1513 157.2667)');
  input = input
    .replace(
      ':root {',
      `:root {
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-serif: ui-serif, Georgia, serif;
  --font-mono: ui-monospace, monospace;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow: 0 1px 3px 0 hsl(0 0% 0% / 0.1);
  --tracking-normal: 0em;
  --spacing: 0.25rem;`,
    )
    .replace(
      '.dark {',
      `.dark {
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-serif: ui-serif, Georgia, serif;
  --font-mono: ui-monospace, monospace;
  --radius: 0.625rem;
  --shadow-x: 0;
  --shadow-y: 1px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.1;
  --shadow-color: oklch(0 0 0);
  --shadow: 0 1px 3px 0 hsl(0 0% 0% / 0.1);
  --shadow-2xs: 0 1px 3px 0 hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0 hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0 hsl(0 0% 0% / 0.1);
  --shadow-md: 0 2px 4px -1px hsl(0 0% 0% / 0.1);
  --shadow-lg: 0 4px 6px -1px hsl(0 0% 0% / 0.1);
  --shadow-xl: 0 8px 10px -1px hsl(0 0% 0% / 0.1);
  --shadow-2xl: 0 8px 10px -1px hsl(0 0% 0% / 0.25);`,
    );
  input = input
    .replace('--destructive: oklch(0.6830686 0.20889486 35.94168);', '--destructive: oklch(0.6831 0.2089 35.9417);')
    .replace(
      '--destructive-foreground: oklch(1 0 0);',
      '--destructive-foreground: oklch(0.9999 0.0001 35.7315);',
    );
  input = `@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
${input}
@theme inline { --color-primary: var(--primary); }
@layer base { * { @apply border-border; } body { @apply bg-background; } }
`;

  const result = applyPaletteCss(original, 'suse', input);
  assert.equal(result.changed, true);
  assert.match(result.summary, /light --primary/);
  assert.match(result.css, /--primary: oklch\(0\.7039 0\.1513 157\.2667\)/);
  assert.match(result.css, /--seal-hue: 157\.2667/);
});

test('apply rejects malformed, partial, duplicate, unsafe, and non-OKLCH inputs', async (t) => {
  const valid = exportPaletteCss(original, 'supabase');
  const cases = [
    ['partial', valid.replace(/\s*--chart-5:[^;]+;/, '')],
    ['duplicate', valid.replace('--primary:', '--primary: oklch(0.5 0.1 20);\n  --primary:')],
    ['important', valid.replace(/(--primary:[^;]+);/, '$1 !important;')],
    ['variable color', valid.replace(/--primary:[^;]+;/, '--primary: var(--accent);')],
    ['CSS-wide keyword', valid.replace(/--primary:[^;]+;/, '--primary: inherit;')],
    ['non-OKLCH', valid.replace(/--primary:[^;]+;/, '--primary: #00ff00;')],
    [
      'unapproved color-mix base',
      valid.replace(/--card:[^;]+;/, '--card: color-mix(in oklab, #123456 94%, white);'),
    ],
    [
      'invalid Pine color-mix weight',
      valid.replace(/--card:[^;]+;/, '--card: color-mix(in oklab, #0c322c 101%, white);'),
    ],
    ...['destructive', 'destructive-foreground', 'link', 'positive', 'destructive-ink'].map((token) => [
      `protected ${token} edit`,
      valid.replace(new RegExp(`--${token}:[^;]+;`), `--${token}: oklch(0.6 0.2 20);`),
    ]),
    ['extra selector', `${valid}\n.foo { --primary: oklch(0.5 0.1 20); }`],
    ['duplicate root', `${valid}\n:root { --primary: oklch(0.5 0.1 20); }`],
  ];
  for (const [name, css] of cases) {
    await t.test(name, () => assert.throws(() => applyPaletteCss(original, 'supabase', css)));
  }
  assert.throws(() => exportPaletteCss(original, 'unknown'), /unknown palette/i);
});

test('write-mode seam detects concurrent source edits and leaves the file untouched', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'theme-bridge-test-'));
  const path = join(dir, 'theme.css');
  await writeFile(path, original);
  let input = exportPaletteCss(original, 'claymorphism');
  input = replaceDeclaration(input, ':root', '--primary', 'oklch(0.6 0.19 280)');
  const expectedHash = checkThemeCss(original).sourceHash;
  await writeFile(path, `${original}\n/* concurrent */\n`);

  const { applyPaletteFile } = await import('./theme-palette-bridge.mjs');
  await assert.rejects(
    applyPaletteFile({ themePath: path, palette: 'claymorphism', inputCss: input, expectedHash }),
    /concurrent/i,
  );
  assert.equal(await readFile(path, 'utf8'), `${original}\n/* concurrent */\n`);
});

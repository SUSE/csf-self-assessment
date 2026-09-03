#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEFAULT_THEME = resolve(REPO_ROOT, 'packages/platform/src/ui/theme.css');

// Brand pairs first, then the imported presets — the same order the picker uses.
// The three non-default brand pairs are hand-authored against the brand guide, not
// tweakcn output; they are listed here so `check` validates their structure and an
// `export` can seed a tweakcn session, NOT because they came from one. An `apply`
// against them is legitimate but consequential: it can move brand literals that
// suse-brand-policy.node-tests.mjs asserts, so run that suite after.
export const PALETTES = Object.freeze([
  { id: 'suse', light: ':root,\n.theme-suse', dark: '.dark,\n.theme-suse.dark' },
  { id: 'pine-mint', light: '.theme-pine-mint', dark: '.theme-pine-mint.dark' },
  {
    id: 'fog-editorial',
    light: '.theme-fog-editorial',
    dark: '.theme-fog-editorial.dark',
  },
  { id: 'instrument', light: '.theme-instrument', dark: '.theme-instrument.dark' },
  {
    id: 'claymorphism',
    light: '.theme-claymorphism',
    dark: '.theme-claymorphism.dark',
  },
  { id: 'cleanslate', light: '.theme-cleanslate', dark: '.theme-cleanslate.dark' },
  {
    id: 'modern-minimal',
    light: '.theme-modern-minimal',
    dark: '.theme-modern-minimal.dark',
  },
  { id: 'supabase', light: '.theme-supabase', dark: '.theme-supabase.dark' },
]);

const CORE = Object.freeze([
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
]);
const REPOSITORY_SEMANTICS = Object.freeze(['link', 'positive', 'destructive-ink']);
const CHARTS = Object.freeze(Array.from({ length: 5 }, (_, i) => `chart-${i + 1}`));
const SIDEBAR = Object.freeze([
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
]);
const SHADOWS = Object.freeze([
  'shadow-2xs',
  'shadow-xs',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
]);
const COLORS = Object.freeze([...CORE, ...REPOSITORY_SEMANTICS, ...CHARTS, ...SIDEBAR]);
const LIGHT_EXPORT = Object.freeze(['radius', ...COLORS, ...SHADOWS]);
const DARK_EXPORT = COLORS;
const PROTECTED = new Set([
  'destructive',
  'destructive-foreground',
  'link',
  'positive',
  'destructive-ink',
]);
const LIGHT_EDITABLE = Object.freeze(LIGHT_EXPORT.filter((token) => !PROTECTED.has(token)));
const DARK_EDITABLE = Object.freeze(DARK_EXPORT.filter((token) => !PROTECTED.has(token)));
const SHADOW_CONTROL_NAMES = Object.freeze([
  'shadow-color',
  'shadow-opacity',
  'shadow-blur',
  'shadow-spread',
  'shadow-offset-x',
  'shadow-offset-y',
]);
const CSS_WIDE = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer']);
const TWEAKCN_METADATA = new Set([
  'font-sans',
  'font-serif',
  'font-mono',
  'shadow-x',
  'shadow-y',
  'shadow-blur',
  'shadow-spread',
  'shadow-opacity',
  'shadow-color',
  'shadow',
  'tracking-normal',
  'spacing',
]);
const TWEAKCN_WRAPPERS = new Map([
  ['import', new Set(['"tailwindcss"', "'tailwindcss'"])],
  ['custom-variant', new Set(['dark (&:is(.dark *))'])],
  ['theme', new Set(['inline'])],
  ['layer', new Set(['base'])],
]);

function fail(message) {
  throw new Error(`theme-palette-bridge: ${message}`);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function paletteFor(id) {
  const palette = PALETTES.find((item) => item.id === id);
  if (!palette) fail(`unknown palette “${id}”; expected ${PALETTES.map((p) => p.id).join(', ')}`);
  return palette;
}

function parse(css, from = undefined) {
  try {
    return postcss.parse(css, { from });
  } catch (error) {
    fail(`CSS parse failed: ${error.reason ?? error.message}`);
  }
}

function rulesBySelector(root, selector) {
  const rules = [];
  root.walkRules((rule) => {
    if (rule.selector === selector) rules.push(rule);
  });
  return rules;
}

function declarations(rule, label) {
  const values = new Map();
  for (const node of rule.nodes ?? []) {
    if (node.type === 'comment') continue;
    if (node.type !== 'decl') fail(`${label} contains a non-declaration node`);
    if (!node.prop.startsWith('--')) fail(`${label} contains non-token declaration ${node.prop}`);
    const token = node.prop.slice(2);
    if (values.has(token)) fail(`${label} declares --${token} more than once`);
    values.set(token, node);
  }
  return values;
}

function sourceModel(css) {
  const root = parse(css, DEFAULT_THEME);
  const pairs = new Map();
  for (const palette of PALETTES) {
    const lightRules = rulesBySelector(root, palette.light);
    const darkRules = rulesBySelector(root, palette.dark);
    if (lightRules.length !== 1) {
      fail(`${palette.id} needs exactly one light rule ${JSON.stringify(palette.light)}`);
    }
    if (darkRules.length !== 1) {
      fail(`${palette.id} needs exactly one dark rule ${JSON.stringify(palette.dark)}`);
    }
    pairs.set(palette.id, {
      palette,
      lightRule: lightRules[0],
      darkRule: darkRules[0],
      light: declarations(lightRules[0], `${palette.id} light rule`),
      dark: declarations(darkRules[0], `${palette.id} dark rule`),
    });
  }
  return { root, pairs };
}

function requireTokens(map, tokens, label) {
  for (const token of tokens) {
    const decl = map.get(token);
    if (!decl || decl.value.trim() === '') fail(`${label} is missing non-empty --${token}`);
  }
}

function effectiveSourceValue(model, paletteId, mode, token) {
  const pair = model.pairs.get(paletteId);
  const own = pair[mode].get(token);
  if (own) return own.value.trim();

  if (mode === 'dark') {
    const inheritedFromLight = pair.light.get(token);
    if (inheritedFromLight) return inheritedFromLight.value.trim();
  }

  const rootPair = model.pairs.get('suse');
  const fallback = rootPair[mode].get(token) ?? (mode === 'dark' ? rootPair.light.get(token) : null);
  if (!fallback) fail(`${paletteId} ${mode} cannot inherit --${token}`);
  return fallback.value.trim();
}

function parseOklch(value) {
  if (/var\s*\(/i.test(value) || CSS_WIDE.has(value.toLowerCase())) return null;
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  const match = new RegExp(
    `^oklch\\(\\s*(${number})(%)?\\s+(${number})\\s+(${number})(?:deg)?(?:\\s*\\/\\s*(${number})(%)?)?\\s*\\)$`,
    'i',
  ).exec(value);
  if (!match) return null;
  const lightness = Number(match[1]) / (match[2] ? 100 : 1);
  const chroma = Number(match[3]);
  const hue = Number(match[4]);
  const alpha = match[5] === undefined ? 1 : Number(match[5]) / (match[6] ? 100 : 1);
  if (
    !Number.isFinite(lightness) ||
    !Number.isFinite(chroma) ||
    !Number.isFinite(hue) ||
    !Number.isFinite(alpha) ||
    lightness < 0 ||
    lightness > 1 ||
    chroma < 0 ||
    alpha < 0 ||
    alpha > 1
  ) {
    return null;
  }
  return { lightness, chroma, hue, alpha };
}

function isValidOklch(value) {
  return parseOklch(value) !== null;
}

function isValidColorValue(value) {
  if (isValidOklch(value)) return true;
  const pineMix = /^color-mix\(in oklab, #0c322c (\d+(?:\.\d*)?|\.\d+)%, (?:white|black)\)$/i.exec(value);
  return pineMix !== null && Number(pineMix[1]) <= 100;
}

function protectedColorMatches(imported, source) {
  if (imported === source) return true;
  const left = parseOklch(imported);
  const right = parseOklch(source);
  if (!left || !right || Math.abs(left.alpha - right.alpha) > 0.0001) return false;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const delta = Math.hypot(
    left.lightness - right.lightness,
    left.chroma * Math.cos(radians(left.hue)) - right.chroma * Math.cos(radians(right.hue)),
    left.chroma * Math.sin(radians(left.hue)) - right.chroma * Math.sin(radians(right.hue)),
  );
  // tweakcn converts through its color picker and rounds on export. Permit only
  // sub-perceptual serialization drift; protected contracts are never written.
  return delta <= 0.001;
}

function hueFromPrimary(value) {
  if (!isValidOklch(value)) fail(`cannot derive --seal-hue from invalid --primary: ${value}`);
  const inner = value.slice(value.indexOf('(') + 1, value.lastIndexOf(')')).split('/')[0].trim();
  const parts = inner.split(/\s+/);
  return parts[2].replace(/deg$/i, '');
}

function emitRule(selector, tokens, getValue, protectedTokens = new Set()) {
  const lines = [`${selector} {`];
  for (const token of tokens) {
    const suffix = protectedTokens.has(token) ? ' /* protected: preview only */' : '';
    lines.push(`  --${token}: ${getValue(token)};${suffix}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function firstShadowLayer(value) {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const character = value[i];
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth < 0) fail(`malformed --shadow-sm: ${value}`);
    } else if (character === ',' && depth === 0) {
      return value.slice(0, i).trim();
    }
  }
  if (depth !== 0) fail(`malformed --shadow-sm: ${value}`);
  return value.trim();
}

function shadowControls(value) {
  const layer = firstShadowLayer(value);
  const colorMatch = /((?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)\s*$/i.exec(
    layer,
  );
  if (!colorMatch) fail(`cannot extract a literal color from --shadow-sm: ${value}`);
  const color = colorMatch[1];
  const geometry = layer.slice(0, colorMatch.index).trim();
  if (/\binset\b/i.test(geometry)) fail(`inset --shadow-sm is not supported: ${value}`);
  const lengths = geometry.split(/\s+/).filter(Boolean);
  if (lengths.length < 2 || lengths.length > 4) {
    fail(`--shadow-sm needs two to four geometry values before its color: ${value}`);
  }
  const validLength = /^0$|^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em)$/i;
  if (!lengths.every((item) => validLength.test(item))) {
    fail(`--shadow-sm contains unsupported geometry: ${value}`);
  }
  const normalized = (item) => (item === '0' ? '0px' : item);
  const alphaMatch = /\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%?)\s*\)$/i.exec(color);
  let opacity = '1';
  let opaqueColor = color;
  if (alphaMatch) {
    opacity = String(Number(alphaMatch[1]) / (alphaMatch[2] ? 100 : 1));
    opaqueColor = `${color.slice(0, alphaMatch.index).trimEnd()})`;
  } else if (/^(?:rgba|hsla)\(/i.test(color)) {
    fail(`legacy comma-alpha shadow colors are ambiguous: ${value}`);
  }
  return {
    'shadow-color': opaqueColor,
    'shadow-opacity': opacity,
    'shadow-blur': normalized(lengths[2] ?? '0'),
    'shadow-spread': normalized(lengths[3] ?? '0'),
    'shadow-offset-x': normalized(lengths[0]),
    'shadow-offset-y': normalized(lengths[1]),
  };
}

function effectivePaletteValues(model, paletteId) {
  const modes = {};
  for (const mode of ['light', 'dark']) {
    modes[mode] = Object.fromEntries(
      COLORS.map((token) => [token, effectiveSourceValue(model, paletteId, mode, token)]),
    );
  }
  modes.light.radius = effectiveSourceValue(model, paletteId, 'light', 'radius');
  for (const token of SHADOWS) {
    modes.light[token] = effectiveSourceValue(model, paletteId, 'light', token);
  }
  Object.assign(modes.light, shadowControls(modes.light['shadow-sm']));
  return modes;
}

export function palettePresetValues(css, paletteId) {
  paletteFor(paletteId);
  const model = sourceModel(css);
  checkThemeCss(css);
  const values = effectivePaletteValues(model, paletteId);
  return {
    id: paletteId,
    light: values.light,
    dark: values.dark,
    protectedTokens: [...PROTECTED],
    shadowControlNames: [...SHADOW_CONTROL_NAMES],
  };
}

export function checkThemeCss(css) {
  const model = sourceModel(css);
  const report = PALETTES.map((palette) => {
    const pair = model.pairs.get(palette.id);
    requireTokens(pair.light, LIGHT_EDITABLE, `${palette.id} light rule`);
    requireTokens(pair.dark, DARK_EDITABLE, `${palette.id} dark rule`);
    requireTokens(model.pairs.get('suse').light, [...PROTECTED], 'suse light rule');
    requireTokens(model.pairs.get('suse').dark, [...PROTECTED], 'suse dark rule');
    hueFromPrimary(pair.light.get('primary').value.trim());
    return { id: palette.id, light: pair.lightRule.selector, dark: pair.darkRule.selector };
  });
  report.sourceHash = hash(css);
  return report;
}

export function exportPaletteCss(css, paletteId) {
  paletteFor(paletteId);
  const model = sourceModel(css);
  checkThemeCss(css);
  const values = effectivePaletteValues(model, paletteId);
  const light = emitRule(':root', LIGHT_EXPORT, (token) => values.light[token], PROTECTED);
  const dark = emitRule('.dark', DARK_EXPORT, (token) => values.dark[token], PROTECTED);
  return `/* tweakcn bridge export: ${paletteId}\n * Repository semantic colours are preview-only protected contracts. */\n${light}\n\n${dark}\n`;
}

function parseInput(css) {
  const root = parse(css);
  const substantive = root.nodes.filter((node) => node.type !== 'comment');
  const rules = [];
  for (const node of substantive) {
    if (node.type === 'rule') {
      rules.push(node);
      continue;
    }
    if (node.type !== 'atrule') {
      fail('input contains unsupported top-level CSS');
    }
    const allowedParams = TWEAKCN_WRAPPERS.get(node.name);
    if (!allowedParams?.has(node.params.trim())) {
      fail(`input contains unsupported @${node.name}${node.params ? ` ${node.params}` : ''}`);
    }
  }
  const roots = rules.filter((node) => node.selector === ':root');
  const darks = rules.filter((node) => node.selector === '.dark');
  if (roots.length !== 1 || darks.length !== 1 || rules.length !== 2) {
    fail('input needs one unambiguous :root/.dark pair and no other selectors');
  }
  const light = declarations(roots[0], 'input :root');
  const dark = declarations(darks[0], 'input .dark');
  for (const map of [light, dark]) {
    for (const token of TWEAKCN_METADATA) map.delete(token);
  }
  // tweakcn repeats inherited light-only values in its dark export. Ignore those copies;
  // the bridge keeps radius and shadows owned by the source light rule.
  for (const token of LIGHT_EXPORT) if (!DARK_EXPORT.includes(token)) dark.delete(token);
  requireTokens(light, LIGHT_EXPORT, 'input :root');
  requireTokens(dark, DARK_EXPORT, 'input .dark');
  for (const [mode, map, allowed] of [
    ['light', light, new Set(LIGHT_EXPORT)],
    ['dark', dark, new Set(DARK_EXPORT)],
  ]) {
    for (const [token, decl] of map) {
      if (!allowed.has(token)) fail(`input ${mode} contains unsupported --${token}`);
      if (decl.important) fail(`input ${mode} --${token} uses !important`);
      const value = decl.value.trim();
      if (value === '' || CSS_WIDE.has(value.toLowerCase())) {
        fail(`input ${mode} --${token} has an empty or CSS-wide value`);
      }
      if (COLORS.includes(token) && !isValidColorValue(value)) {
        fail(`input ${mode} --${token} must be a literal valid OKLCH color or approved Pine color-mix`);
      }
    }
  }
  return { light, dark };
}

function lineOffsets(css) {
  const offsets = [0];
  for (let i = 0; i < css.length; i += 1) if (css[i] === '\n') offsets.push(i + 1);
  return offsets;
}

function valueRange(css, decl, offsets) {
  const start = offsets[decl.source.start.line - 1] + decl.source.start.column - 1;
  const end = offsets[decl.source.end.line - 1] + decl.source.end.column;
  const text = css.slice(start, end);
  const colon = text.indexOf(':');
  const semicolon = text.lastIndexOf(';');
  if (colon < 0 || semicolon < colon) fail(`cannot locate source range for ${decl.prop}`);
  let valueStart = start + colon + 1;
  while (/\s/.test(css[valueStart])) valueStart += 1;
  let valueEnd = start + semicolon;
  while (valueEnd > valueStart && /\s/.test(css[valueEnd - 1])) valueEnd -= 1;
  return { start: valueStart, end: valueEnd };
}

function unifiedDiff(paletteId, changes) {
  if (changes.length === 0) return '';
  const lines = [`--- theme.css`, `+++ theme.css (${paletteId})`];
  for (const change of changes) {
    lines.push(`@@ ${change.mode} --${change.token} @@`);
    lines.push(`-${change.oldValue}`);
    lines.push(`+${change.newValue}`);
  }
  return `${lines.join('\n')}\n`;
}

export function applyPaletteCss(sourceCss, paletteId, inputCss) {
  paletteFor(paletteId);
  const model = sourceModel(sourceCss);
  checkThemeCss(sourceCss);
  const input = parseInput(inputCss);
  for (const mode of ['light', 'dark']) {
    for (const token of PROTECTED) {
      const imported = input[mode].get(token).value.trim();
      const protectedValue = effectiveSourceValue(model, paletteId, mode, token);
      if (!protectedColorMatches(imported, protectedValue)) {
        fail(`input ${mode} attempts to edit protected --${token}`);
      }
    }
  }
  const pair = model.pairs.get(paletteId);
  const edits = [];
  const changes = [];
  const offsets = lineOffsets(sourceCss);

  for (const [mode, tokens] of [
    ['light', LIGHT_EDITABLE],
    ['dark', DARK_EDITABLE],
  ]) {
    for (const token of tokens) {
      const target = pair[mode].get(token);
      if (!target) fail(`${paletteId} ${mode} source rule is missing editable --${token}`);
      const oldValue = target.value.trim();
      const newValue = input[mode].get(token).value.trim();
      if (oldValue === newValue) continue;
      edits.push({ ...valueRange(sourceCss, target, offsets), value: newValue });
      changes.push({ mode, token, oldValue, newValue });
    }
  }

  const hueDecl = pair.light.get('seal-hue');
  if (!hueDecl) fail(`${paletteId} light source rule is missing derived --seal-hue`);
  const derivedHue = hueFromPrimary(input.light.get('primary').value.trim());
  if (hueDecl.value.trim() !== derivedHue) {
    edits.push({ ...valueRange(sourceCss, hueDecl, offsets), value: derivedHue });
    changes.push({
      mode: 'light',
      token: 'seal-hue (derived)',
      oldValue: hueDecl.value.trim(),
      newValue: derivedHue,
    });
  }

  edits.sort((a, b) => b.start - a.start);
  let css = sourceCss;
  for (const edit of edits) css = `${css.slice(0, edit.start)}${edit.value}${css.slice(edit.end)}`;
  checkThemeCss(css);

  const summaryLines = [
    paletteId === 'suse'
      ? 'SUSE is the editable brand-derived default palette (and its preview alias remains combined).'
      : `Palette ${paletteId}: ${changes.length} allowlisted value change(s).`,
    ...changes.map(
      ({ mode, token, oldValue, newValue }) => `${mode} --${token}: ${oldValue} → ${newValue}`,
    ),
  ];
  return {
    changed: changes.length > 0,
    css,
    changes,
    summary: summaryLines.join('\n'),
    diff: unifiedDiff(paletteId, changes),
    sourceHash: hash(sourceCss),
  };
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function applyPaletteFile({ themePath = DEFAULT_THEME, palette, inputCss, expectedHash }) {
  const current = await readFile(themePath, 'utf8');
  if (expectedHash !== undefined && hash(current) !== expectedHash) {
    fail('concurrent source change detected; theme.css was not written');
  }
  const result = applyPaletteCss(current, palette, inputCss);
  if (!result.changed) return result;
  const beforeWrite = await readFile(themePath, 'utf8');
  if (hash(beforeWrite) !== result.sourceHash) {
    fail('concurrent source change detected before write; theme.css was not written');
  }
  await atomicWrite(themePath, result.css);
  const written = await readFile(themePath, 'utf8');
  checkThemeCss(written);
  if (written !== result.css) fail('post-write verification did not match the intended bytes');
  return result;
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  const options = { command, themePath: DEFAULT_THEME, write: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--') {
      continue;
    } else if (arg === '--write') {
      options.write = true;
    } else if (['--palette', '--out', '--input', '--theme'].includes(arg) && rest[i + 1]) {
      const key = arg.slice(2);
      options[key === 'theme' ? 'themePath' : key] = resolve(rest[++i]);
      if (arg === '--palette') options.palette = rest[i];
    } else {
      fail(`unknown or incomplete argument ${arg}`);
    }
  }
  if (!['export', 'apply', 'check'].includes(command)) {
    fail('usage: <export|apply|check> [--palette <id>] [--input <file>] [--out <file>] [--write]');
  }
  return options;
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  const source = await readFile(options.themePath, 'utf8');
  if (options.command === 'check') {
    const report = checkThemeCss(source);
    console.log(`theme-palette-bridge: OK — ${report.length} palette pairs, ${report.sourceHash}`);
    return;
  }
  if (!options.palette) fail(`${options.command} requires --palette <id>`);
  if (options.command === 'export') {
    const css = exportPaletteCss(source, options.palette);
    if (options.out) {
      await atomicWrite(options.out, css);
      console.error(`theme-palette-bridge: exported ${options.palette} to ${options.out}`);
    } else {
      process.stdout.write(css);
    }
    return;
  }
  if (!options.input) fail('apply requires --input <file>');
  const inputCss = await readFile(options.input, 'utf8');
  const result = applyPaletteCss(source, options.palette, inputCss);
  console.error(result.summary);
  if (result.diff) process.stdout.write(result.diff);
  else console.error('No changes.');
  if (options.write && result.changed) {
    await applyPaletteFile({
      themePath: options.themePath,
      palette: options.palette,
      inputCss,
      expectedHash: result.sourceHash,
    });
    console.error('theme-palette-bridge: theme.css updated atomically and revalidated.');
  } else if (!options.write) {
    console.error('Dry run only; pass --write to update theme.css.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

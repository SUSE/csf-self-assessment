// Generate the imported-palette token blocks for src/ui/theme.css from
// shadcnblocks / tweakcn `registry:theme` items.
//
// Why a script instead of `shadcn add`: this repo is shadcn-SVELTE (see
// packages/platform/components.json), so the React `shadcn` CLI rejects the
// config outright — and a `registry:theme` add would overwrite theme.css, which
// is hand-maintained (vendored @font-face, SEAL/warning tokens, the base layer).
// Fetching the JSON and emitting only the blocks keeps that file ours.
//
// What is deliberately NOT adopted from a palette:
//   font-*      — SUSE/SUSE Mono are the vendored brand faces and remote font
//                 loading is barred (invariant #7).
//   bare shadow — Tailwind v4 has no `shadow` utility consuming it; dead token.
//   destructive — DROPPED even though every palette declares one, because a
//                 preset tunes its danger red to its own surfaces and Supabase's
//                 dark red (L 0.31 on a near-black background, ~1.5:1) made the
//                 issue badge and every validation message invisible under that
//                 palette. Danger is a legibility contract; it inherits from
//                 :root/.dark like --warning and --destructive-foreground.
//   destructive-foreground — not present in these palettes anyway; inherits from
//                 :root/.dark on purpose so "danger" never becomes
//                 palette-dependent.
//
// What is ADDED that no palette declares:
//   warning, warning-foreground — the attention amber. A preset has no such
//                 token, and inheriting SUSE's meant the one accent that says "a
//                 decision is owed here" was the one colour a palette switch did
//                 not move. Emitted as a relative colour off the palette's own
//                 --primary, pinned to hue 70 and clamped to a legible L/C band,
//                 so every palette keeps the same amber SEMANTIC while wearing
//                 its own. Light block only — the dark twin matches the same
//                 element, so the dark --primary flows through at use time.
//
// Usage (from the repo root):
//
//     node packages/platform/scripts/gen-theme-palettes.mjs
//
// This output is CANDIDATE INPUT, never text to paste over theme.css. Import it
// into tweakcn for visual editing, export from tweakcn, then apply the selected
// palette through `pnpm theme:tweakcn:apply -- --palette <id> --input <file>`.
// The bridge preserves this repository's fonts, warning/destructive contracts,
// SEAL ramp, Tailwind mappings, selectors, comments, and base rules.
//
// Run this generator BARE, not through `rtk` — rtk's filter strips the blank
// separator line before each shadow group, corrupting redirected candidate CSS.
//
// Adding a palette still requires a reviewed source pair in theme.css plus the id
// in the `Palette` union and `PALETTES` in src/ui/theme/theme.svelte.ts; extend the
// bridge's canonical mapping in the same change.

/** @type {ReadonlyArray<{ id: string; title: string; note: string }>} */
const PALETTES = [
  {
    id: 'claymorphism',
    title: 'Claymorphism',
    note: 'soft clay: 1.25rem radius, wide diffuse shadows, violet primary',
  },
  {
    id: 'cleanslate',
    title: 'Clean Slate',
    note: 'crisp neutral slate, 0.5rem radius, violet primary',
  },
  {
    id: 'modern-minimal',
    title: 'Modern Minimal',
    note: 'restrained blue on near-white, tight 0.375rem radius',
  },
  {
    id: 'supabase',
    title: 'Supabase',
    note: 'mint green on neutral grey',
  },
];

// The bare host 308-redirects; `www` is the canonical origin.
const REGISTRY = 'https://www.shadcnblocks.com/r/theme';

const SKIP = /^font-|^shadow$|^destructive$/;
const SHADOW = /^shadow-/;

/**
 * The SEAL ramp's hue (see ADR-0014). Derived from the palette's own `--primary`
 * rather than authored, so the ordinal ramp and the palette can never disagree
 * about what "this palette's hue" is — one source, no second value to maintain.
 * Only the LIGHT block declares it: `.theme-<id>` and `.theme-<id>.dark` both
 * match the same `<html>` element, so the dark twin inherits it.
 */
function sealHue(lightVars) {
  const m = /^oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/.exec(lightVars.primary ?? '');
  if (!m) throw new Error(`cannot read a hue from --primary: ${lightVars.primary}`);
  return m[1];
}

/**
 * The attention amber, derived rather than inherited (see the header). Hue 70 is
 * the contract; L and C come from the palette's own `--primary`, clamped to a
 * band that stays legible as a fill on every palette's card in both modes — a
 * preset's primary can be as dark as L 0.44 (Supabase dark) or as pale as L 0.83
 * (Supabase light), and neither works as an amber untouched.
 */
const WARNING = [
  '  --warning: oklch(from var(--primary) clamp(0.62, l, 0.78) clamp(0.11, c, 0.2) 70);',
  '  --warning-foreground: oklch(from var(--warning) 0.22 0.05 h);',
];

/** Emit one selector block: seal hue, radius, colours, then the shadow ramp. */
function block(selector, vars, hue) {
  const keys = Object.keys(vars).filter((k) => !SKIP.test(k));
  const radius = keys.filter((k) => k === 'radius');
  const colour = keys.filter((k) => k !== 'radius' && !SHADOW.test(k));
  const shadow = keys.filter((k) => SHADOW.test(k));

  const lines = [`${selector} {`];
  if (hue) {
    lines.push(`  --seal-hue: ${hue}; /* drives the whole SEAL ramp — ADR-0014 */`);
    // Light block only, like --seal-hue: both selectors match the same element,
    // so the dark --primary flows through this expression at use time.
    lines.push(...WARNING);
  }
  for (const k of [...radius, ...colour]) lines.push(`  --${k}: ${vars[k]};`);
  if (shadow.length) {
    lines.push('');
    for (const k of shadow) lines.push(`  --${k}: ${vars[k]};`);
  }
  lines.push('}');
  return lines.join('\n');
}

const out = [];
for (const { id, title, note } of PALETTES) {
  const response = await fetch(`${REGISTRY}/${id}`);
  if (!response.ok) {
    throw new Error(`${id}: registry returned ${response.status}`);
  }
  const item = await response.json();
  const rule = '-'.repeat(Math.max(3, 60 - title.length - id.length));

  out.push(`/* ---- ${title} (.theme-${id}) ${rule}`);
  out.push(` * tweakcn — ${note}. Fonts intentionally not adopted (SUSE stays). */`);
  out.push(block(`.theme-${id}`, item.cssVars.light, sealHue(item.cssVars.light)));
  out.push(block(`.theme-${id}.dark`, item.cssVars.dark));
  out.push('');
}

console.log(out.join('\n'));

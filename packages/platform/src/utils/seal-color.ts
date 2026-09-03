import type { Seal } from '../schema';

// Single source of truth for the SEAL ramp used across every view (the HUD mini
// heat map, the ladder badges, the dashboard's heat/staircase/exposure tiles and
// the radial wheels). Pure presentation — no truth is computed here.
//
// SEAL 0→4 is ORDINAL: each rung is strictly more sovereignty, with no neutral
// midpoint. The ramp is therefore ONE HUE stepping from pale/low-chroma at SEAL-0
// to vivid at SEAL-4, so the reader sees the order in the colour itself. The hue
// is the active palette's `--seal-hue`, so the ramp is theme-aware: green under
// SUSE, violet under Claymorphism and Clean Slate, blue under Modern Minimal.
// Nothing here needs to change when a palette is added — see ui/theme.css.
//
// The arrays are indexed by SEAL, and every class is a LITERAL string on purpose:
// Tailwind v4 extracts class names by scanning source text, so a computed
// `text-seal-${seal}` would compile to no utility at all and silently render
// unstyled. Keep them literal.

const INK = [
  'text-seal-0',
  'text-seal-1',
  'text-seal-2',
  'text-seal-3',
  'text-seal-4',
] as const;

const FILL = [
  'bg-seal-fill-0',
  'bg-seal-fill-1',
  'bg-seal-fill-2',
  'bg-seal-fill-3',
  'bg-seal-fill-4',
] as const;

// `Seal` is the literal union 0|1|2|3|4, but these are called with values that
// have crossed a JSON boundary, so the index is clamped rather than trusted.
function step(seal: Seal): 0 | 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(0, Math.round(seal))) as 0 | 1 | 2 | 3 | 4;
}

// The FILL ramp: a tinted surface for cells, chips and badges, carrying ordinary
// `text-foreground` text. It is deliberately NOT a percentage mix of the ink —
// mixing compresses each step's lightness by ~78%, which on a single-hue ramp
// (where lightness is the only channel that separates steps) collapsed adjacent
// cells to ΔL ≈ 0.02, far below the ~0.06 an ordinal ramp needs to stay readable.
// The two ramps are stepped independently against their own surface.
export function sealSwatchClass(seal: Seal): string {
  return `${FILL[step(seal)]} text-foreground`;
}

// The same ramp as INK, for text and for SVG views (the wheels), where `bg-*`
// cannot apply. Returns a TEXT utility so a shape can carry
// `fill="currentColor"` / `stroke="currentColor"` and stay themed. Kept beside
// sealSwatchClass so the two never drift.
export function sealInkClass(seal: Seal): string {
  return INK[step(seal)];
}

/** What a drawn share claims: a rung, a tail owed, a member of an infographic
 *  series, or none of those. */
export type ShareFill = Seal | 'open' | 'ink' | 'series';

// The choice every drawn ratio makes about its fill, in one place. A tail owed takes
// the act-here amber's ink step and never a seal — a backlog is not a level. `series` takes the
// theme's first infographics slot, for a measurement that is neither: it reads as a
// drawn quantity rather than as structure, and recolours with the palette. Returns a
// TEXT utility so one function serves both planes: `bg-current` on an HTML fill,
// `fill-current` on an SVG mark.
export function shareInkClass(fill: ShareFill): string {
  if (fill === 'ink') return 'text-axis-ink';
  if (fill === 'open') return 'text-warning-ink';
  if (fill === 'series') return 'text-chart-1';
  return sealInkClass(fill);
}

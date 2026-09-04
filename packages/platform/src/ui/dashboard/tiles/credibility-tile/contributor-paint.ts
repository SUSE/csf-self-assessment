// One paint per slice, shared by the arc and its legend swatch so the two cannot
// drift. Returns a TEXT utility, as `shareInkClass` does: `fill-current` on the
// arc, `bg-current` on the legend dot.

// The theme's own infographics series, which reserved for exactly this
// reading. Never the SEAL ramp and never the amber: a share of authorship is
// neither a rung nor a decision owed (product principle #3).

// Known degradation, accepted: the five slots are five hues under the BRAND
// palettes, but the four imported palettes re-declare them as a sequential
// one-hue ramp, where the ring reads as one band stepped by intensity. The order
// is still right and the seams still divide it — see the seam width in
// `contributor-donut.svelte`, which is what carries the division there.

// Literal strings: Tailwind v4 scans source text, so a computed slot index
// compiles to no utility at all.
const SLICE = [
  'text-chart-1',
  'text-chart-2',
  'text-chart-3',
  'text-chart-4',
  'text-chart-5',
] as const;

// `index` is the row's place in the ranked reading, which is also its place
// clockwise from twelve. The reading folds at five lines, so the series is
// never exhausted.
export function contributorInkClass(index: number): string {
  return SLICE[Math.min(index, SLICE.length - 1)];
}

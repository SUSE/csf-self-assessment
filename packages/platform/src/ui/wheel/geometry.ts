import type { Seal } from '../../schema';

// One coordinate space and one label-placement rule for every radial figure in
// the app: the question, merge and instrument wheels, plus the estate and
// objectives tiles. Pure — no state, no DOM — so the wheels stay in register.

// Wide enough that a long authored dimension name ("Platform (containers &
// PaaS)") clears the edge even with a full marker stack outside the rim.
export const WHEEL_VIEWBOX = { width: 680, height: 420, cx: 340, cy: 200, hub: 28 } as const;

// SEAL 0–4 map to fixed radii regardless of the ladder: a sparse ladder simply
// offers no rung at that ring, it does not move the others. The rings
// pull in when a marker ring has to fit outside them.
export const RINGS_PLAIN: SealRings = [44, 68, 92, 116, 140] as const;
export const RINGS_EXPOSED: SealRings = [36, 56, 76, 96, 116] as const;

// The five SEAL radii of one ring set — indexable by a Seal with no fallback.
export type SealRings = readonly [number, number, number, number, number];

export function ringRadius(rings: SealRings, seal: Seal): number {
  return rings[seal];
}

export const CX = WHEEL_VIEWBOX.cx;
export const CY = WHEEL_VIEWBOX.cy;
export const HUB = WHEEL_VIEWBOX.hub;
// The rim when no marker ring has to fit outside it.
export const RIM = RINGS_PLAIN[4];

export const MARKER_GAP = 14;
export const MARKER_STEP = 13;

export function markerRadius(rim: number, index: number): number {
  return rim + MARKER_GAP + MARKER_STEP * index;
}

export function labelRadius(rim: number, maxMarkers: number): number {
  return maxMarkers === 0 ? rim + 12 : markerRadius(rim, maxMarkers - 1) + 18;
}

// Long authored names would run off the viewBox; the full text stays in <title>.
// 20 chars at 13px is the widest label that still clears the edge on the deepest
// marker stack — see the geometry test.
export const LABEL_MAX_CHARS = 20;
// Conservative advance width for the 13px label face.
export const LABEL_CHAR_PX = 7;
// Conservative advance width for the 11px sub face.
export const SUB_CHAR_PX = 5.5;

export function truncate(text: string, max = LABEL_MAX_CHARS): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// How many characters of a name still fit when its count rides on the SAME line
// (`Compute 0 of 9`) rather than under it. A longer count buys a shorter name
// and never an overflow — one edge budget spent two ways.
export function inlineNameBudget(labelR: number, sub: string, gap = 8): number {
  const room = WHEEL_VIEWBOX.width - (WHEEL_VIEWBOX.cx + labelR + gap);
  const fits = Math.floor((room - sub.length * SUB_CHAR_PX - gap) / LABEL_CHAR_PX);
  return Math.max(6, Math.min(LABEL_MAX_CHARS, fits));
}

// Degrees measured clockwise from 12 o'clock, the way every wheel lays out.
export function polar(cx: number, cy: number, r: number, degFromTop: number): [number, number] {
  const t = (degFromTop * Math.PI) / 180;
  return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
}

// Evenly spaced spokes, the first at 12 o'clock.
export function spokeAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i * 360) / count);
}

// Tangential + vertical shove off a label's own anchor point, so text at the
// poles clears the spoke it names.
export type LabelNudge = { dx: number; dy: number };

export function labelNudge(deg: number): LabelNudge {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    dx: s > 0.25 ? 8 : s < -0.25 ? -8 : 0,
    dy: c > 0.5 ? -6 : c < -0.5 ? 10 : 2,
  };
}

// Text anchor for a label sitting at `deg`, so labels grow away from the hub.
export function labelAnchor(deg: number): 'start' | 'middle' | 'end' {
  const s = Math.sin((deg * Math.PI) / 180);
  if (s > 0.25) return 'start';
  if (s < -0.25) return 'end';
  return 'middle';
}

// --- label de-collision -------------------------------------------------------
// Spokes are evenly spaced by ANGLE, but the eye reads screen position, and the
// vertical gap between adjacent labels collapses toward the 12 and 6 o'clock
// poles. A radial nudge is no fix — near a pole "outward" is almost vertical, so
// pushing a label out shoves it into the one below. Instead each side's y-centres
// are spread apart with the least total movement.

export type PlacedLabel = {
  // Anchor x, with the tangential nudge off the spoke already in.
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
};

export type PlaceLabelsOptions = {
  // Minimum centre-to-centre vertical gap between two same-side labels.
  minGap?: number;
  // Tangential shove off the spoke tip, so text never sits on the painted spoke.
  hGap?: number;
  // Cap on a side's column height. When a side is too crowded for `minGap`, the
  // gap shrinks to fit rather than letting labels march off the viewBox.
  maxSpan?: number;
};

// Nondecreasing isotonic regression by pool-adjacent-violators: the closest
// nondecreasing sequence to `values` in least-squares. This is what makes the
// spread minimal-movement — a run that must move travels together.
function isotonicNondecreasing(values: number[]): number[] {
  const blocks: { sum: number; count: number; mean: number }[] = [];
  for (const v of values) {
    let block = { sum: v, count: 1, mean: v };
    while (blocks.length > 0 && blocks[blocks.length - 1].mean >= block.mean) {
      const prev = blocks.pop() as { sum: number; count: number; mean: number };
      const sum = prev.sum + block.sum;
      const count = prev.count + block.count;
      block = { sum, count, mean: sum / count };
    }
    blocks.push(block);
  }
  const out: number[] = [];
  for (const block of blocks) for (let i = 0; i < block.count; i++) out.push(block.mean);
  return out;
}

// Push desired y-centres at least `gap` apart, moving them as little as possible
// and keeping their mean. Removing the gap turns "≥ gap apart" into
// "nondecreasing", which PAVA solves optimally; then the gap is added back.
function spreadColumn(labels: PlacedLabel[], gap: number): void {
  if (labels.length < 2) return;
  const order = labels.map((_, i) => i).sort((a, b) => labels[a].y - labels[b].y);
  const gapless = order.map((i, k) => labels[i].y - k * gap);
  const fitted = isotonicNondecreasing(gapless);
  order.forEach((i, k) => {
    labels[i].y = fitted[k] + k * gap;
  });
}

// Last resort for a wheel so dense the spread cannot fit: scale the column toward
// its mean until it fits `maxSpan`, keeping order and relative spacing.
function compressToSpan(labels: PlacedLabel[], maxSpan: number): void {
  if (labels.length < 2) return;
  const ys = labels.map((l) => l.y);
  const span = Math.max(...ys) - Math.min(...ys);
  if (span <= maxSpan) return;
  const mean = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  const scale = maxSpan / span;
  for (const label of labels) label.y = mean + (label.y - mean) * scale;
}

// Place labels around a wheel so no two on the same side collide. Each starts at
// its spoke angle, `r` out from the hub, anchored away from the hub. The right arc
// (0°–180°) and left arc (180°–360°) de-collide independently, so a pole label
// never fights one on the far side. Pole spokes sit alone and are left put.
export function placeLabels(
  items: { deg: number; r: number }[],
  cx: number,
  cy: number,
  options: PlaceLabelsOptions = {},
): PlacedLabel[] {
  const { minGap = 34, hGap = 6, maxSpan } = options;

  const placed: PlacedLabel[] = items.map(({ deg, r }) => {
    const [px, py] = polar(cx, cy, r, deg);
    const anchor = labelAnchor(deg);
    const x = px + (anchor === 'start' ? hGap : anchor === 'end' ? -hGap : 0);
    return { x, y: py, anchor };
  });

  const collect = (keep: (deg: number) => boolean): PlacedLabel[] =>
    items.map((it, i) => (keep(it.deg) ? placed[i] : null)).filter((p): p is PlacedLabel => p !== null);

  for (const side of [collect((d) => d > 0 && d < 180), collect((d) => d > 180 && d < 360)]) {
    spreadColumn(side, minGap);
    if (maxSpan !== undefined) compressToSpan(side, maxSpan);
  }

  return placed;
}

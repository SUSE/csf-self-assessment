import {
  labelRadius,
  truncate,
  CY,
  HUB,
  LABEL_CHAR_PX,
  LABEL_MAX_CHARS,
  RIM,
  WHEEL_VIEWBOX,
} from '../wheel';
import type { ChipSeal, InstrumentChip } from './model';

// The ink ladder and label text for the instrument wheel's marks — the rules the
// sibling mark components (bar, party branch, gap stub, label) all read from, so
// they are stated once rather than per mark. Geometry itself is ui/wheel.

// Labels sit just outside the rim. The lone assessment chip at 12 o'clock rides a
// rung further out so it lifts clear of the first dimension beside it.
export const LABEL_R = labelRadius(RIM, 0);
const POLE_LIFT = 30;

export function labelRadiusOf(chip: InstrumentChip): number {
  return chip.kind === 'assessment' ? LABEL_R + POLE_LIFT : LABEL_R;
}

/** How far down the label band can reach, and therefore how tall this figure has
 *  to be. The shared viewBox is 420 tall for the merge wheel, which draws more
 *  below the rim; at 420 this one carried ~60 units of empty floor that stranded
 *  the legend. `placeLabels` gets `maxSpan: height - 72` centred on CY, so no
 *  label lands below `CY + maxSpan / 2` — that bound plus a descent allowance. */
export const FIGURE_HEIGHT = CY + (WHEEL_VIEWBOX.height - 72) / 2 + 10;

// ---- ink ---------------------------------------------------------------------
// Marks are inked in tone off the palette's own ink, never in `--foreground` and
// never in a rotated hue: hue belongs entirely to SEAL (`--seal-hue`), and eleven
// spokes at the brightest value the palette owns read as glare, not hierarchy.
// Emphasis = gates the floor; soft = scores only; destructive = a coverage gap,
// the wheel's one alarm.
export function inkClass(chip: InstrumentChip): string {
  if (chip.empty) return 'text-destructive';
  return chip.emphasis ? 'text-axis-ink' : 'text-axis-ink-soft';
}

// A LABEL sits on the app's TEXT ladder, not the mark ladder: `--axis-ink-soft`
// measures 3.0–3.2:1, right for a 9px mark and short of the 4.5:1 that 13px text
// needs. Weight alone cannot carry the distinction at that size; the muted step
// is what makes the dimensions that gate the floor stand out.
export function labelInkClass(chip: InstrumentChip): string {
  if (chip.empty) return 'text-destructive';
  return chip.emphasis ? 'text-foreground' : 'text-muted-foreground';
}

// Spoke length: the busiest chip fills hub→rim, the rest scale under it. With no
// questions yet every chip is a bare stub at the hub — honest, nothing to size.
export function barEnd(chip: InstrumentChip, maxCount: number): number {
  return maxCount === 0 ? HUB : HUB + (RIM - HUB) * (chip.count / maxCount);
}

// ---- label text --------------------------------------------------------------
// Counts ride the name line, not a second line — a name followed by a compact
// muted suffix: the question-unit count, then `· ◇N` strata when the dimension
// splits (the ◇ ties to the legend). One line halves the label ink and de-congests
// the wheel. The full sentence stays in the title.
const LABEL_META_PX = 6; // conservative advance of the 11px meta face
const LABEL_GAP_PX = 6; // gap between name and meta
// The widest a start/end label may run before it leaves the viewBox (plain rim),
// less a hair of safety — the name is truncated to leave room for its meta.
const LABEL_ROOM_PX = WHEEL_VIEWBOX.width - WHEEL_VIEWBOX.cx - LABEL_R - 8 - 6;

export function labelMeta(chip: InstrumentChip): string {
  return chip.strata > 0 ? `${chip.count} · ◇${chip.strata}` : String(chip.count);
}

// Trailing label suffix: `◈N` at the lowest answered seal, an em-dash when the
// spoke is in scope but nothing on it is answered yet, '' when not reflecting.
export function labelSeal(seal: ChipSeal | null): string {
  if (!seal) return '';
  return seal.seal !== null ? `◈${seal.seal}` : '—';
}

export function labelName(chip: InstrumentChip, seal: ChipSeal | null): string {
  const suffix = labelSeal(seal);
  const sealPx = suffix ? LABEL_GAP_PX + suffix.length * LABEL_META_PX : 0;
  const metaPx = LABEL_GAP_PX + labelMeta(chip).length * LABEL_META_PX + sealPx;
  const budget = Math.min(LABEL_MAX_CHARS, Math.floor((LABEL_ROOM_PX - metaPx) / LABEL_CHAR_PX));
  return truncate(chip.name, Math.max(6, budget));
}

export function chipTitle(chip: InstrumentChip): string {
  if (chip.kind === 'assessment') {
    return `${chip.name} — ${chip.count} asked-once question${chip.count === 1 ? '' : 's'}`;
  }
  if (chip.kind === 'party') {
    return `${chip.name} (${chip.sub}) — ${chip.count} per-party question${chip.count === 1 ? '' : 's'}`;
  }
  const gate = chip.emphasis ? 'critical — gates the floor' : 'scores only';
  const layers = chip.strata > 0 ? `, ${chip.strata} strata` : '';
  const cover = chip.empty
    ? 'no question reaches it yet'
    : `${chip.count} question-unit${chip.count === 1 ? '' : 's'}`;
  return `${chip.name} — ${cover}, ${gate}${layers}`;
}

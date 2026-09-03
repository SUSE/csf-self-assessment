import type { Answer, Seal, Target } from '../../schema';

// A normalised answering unit the fan-out card lays out as a chip. The caller
// (fill-surface/question-fill) maps its grain — declared dimensions, or the
// parties in scope — onto this shape: `target` is where the whole unit rests,
// and `strata`, when present, are the sub-units it can be split into (only the
// dimension grain has them; parties leave it undefined). The card never reads
// the workbook or the grain — it only ever sees units.
export type FanoutUnit = {
  key: string;
  label: string;
  critical: boolean;
  target: Target;
  /** Present ⇒ splittable into these sub-units (a dimension's strata). `label` is the
      full "Dimension · stratum" (used for the drag ghost / landing preview so context
      travels); `short` is the bare stratum ("service") shown as a segment inside the
      dimension's grouped pill. */
  strata?: { key: string; label: string; short: string; target: Target }[];
};

// One draggable thing on the card: a whole unit, or one stratum of a split one.
export type Chip = {
  key: string;
  unitKey: string;
  label: string; // full "Dimension · stratum" (drag payload / ghost / preview)
  short: string; // bare stratum ("service"), shown as a segment in the grouped pill
  critical: boolean;
  splittable: boolean;
  isStratum: boolean;
  target: Target;
  answer: Answer | undefined;
};

// A chip-render group within ONE bin (tray / a rung / an off row): a split
// dimension collapses to a single segmented pill, everything else stays a plain
// chip — so "Compute" is named once, not once per stratum (chip-anatomy prototype).
export type RenderGroup =
  | { grouped: false; chip: Chip; strataCount: number }
  | { grouped: true; unitKey: string; name: string; critical: boolean; fraction: string | null; segs: Chip[] };

/** The unit noun for the tray count, e.g. { one: 'dimension', many: 'dimensions' }. */
export type UnitNoun = { one: string; many: string };
export type TrayCopy = { title: string; hint: string };
/** The most recent answered gesture group on this question, and its seal. */
export type AnsweredGroup = { groupId: string; seal: Seal };
/** The most recent n/a gesture group, its reason, and the chip it named. */
export type NaGroup = { groupId: string; reason: string; label: string };

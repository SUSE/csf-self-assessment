import type { Seal, Workbook } from '../schema';
import { scores, type EngineResult } from '../score-engine';

/**
 * The outer edge of a SEAL-0 wedge as a fraction of the ring's outer radius.
 * Absence is never a zero (analytics invariant #2): SEAL-0 must still draw a
 * visible wedge, distinct from an objective with nothing asserted at all.
 */
export const SEAL_FLOOR_FRACTION = 0.15;

export type ObjectiveStanding =
  | { kind: 'asserted'; seal: Seal; score: number; radiusFraction: number }
  /** Scored, and nothing on it gates — every gate-carrying answer is absent or
   *  the objective is `ranking` all the way down. Gate-vs-rank made visible: a
   *  rank with no floor under it, so the wedge carries no length. */
  | { kind: 'ranked'; score: number }
  | { kind: 'informational' }
  | { kind: 'unanswered' };

export type ObjectiveArc = {
  id: string;
  name: string;
  /** The authored weight, 0..100 — the wedge's angular width (analytics §4.5). */
  weight: number;
  /** Where the wedge starts / ends, as a fraction of the full turn (0..1). */
  startFraction: number;
  endFraction: number;
  /** The wedge's angular midpoint — where its label hangs. */
  midFraction: number;
  /** Second label line: `20% · SEAL-1` / `5% · informational`. */
  sub: string;
  /** The hover/focus line, e.g. `Strategic Sovereignty · SOV-1 · 20% of the
   *  score · SEAL-1 · 53.6`. */
  summary: string;
  standing: ObjectiveStanding;
};

/** One guide ring: the radial axis the wedge lengths are read against. */
export type ObjectiveRung = { seal: Seal; radiusFraction: number };

export type ObjectivesTile = {
  arcs: ObjectiveArc[];
  /** One ring per authored SEAL level, innermost first. */
  rungs: ObjectiveRung[];
  /** `Strategic Sovereignty carries 20% of the score at SEAL-1.` */
  headline: string;
  caption: string;
};

const CAPTION =
  'One wedge per objective: as wide as the weight it carries in the score, as long as the SEAL it stands at — so a wide, short wedge is weakness where it costs most. The rings are the SEAL rungs, the outermost the top of the ladder. A dashed outline is an informational objective, recorded and never scored; a flat wedge is one nothing has been asserted on yet.';

const NOTHING_ASSERTED =
  'Nothing asserted yet — each wedge is already as wide as the weight its objective carries, and gains its length with the first answer.';

/** Pure: derives from the engine result and the instrument, never from answers. */
export function objectivesTile(result: EngineResult, workbook: Workbook): ObjectivesTile {
  const totalWeight = workbook.objectives.reduce((sum, o) => sum + o.weight, 0);
  const topSeal = Math.max(...workbook.sealLevels.map((l) => l.seal));
  const radiusOf = (seal: Seal): number =>
    SEAL_FLOOR_FRACTION + (1 - SEAL_FLOOR_FRACTION) * (seal / topSeal);
  let cursor = 0;
  const arcs = workbook.objectives.map((objective) => {
    const startFraction = cursor / totalWeight;
    cursor += objective.weight;
    const endFraction = cursor / totalWeight;
    const entry = result.objectives.find((o) => o.id === objective.id);
    const standing: ObjectiveStanding =
      entry !== undefined && entry.seal !== null && entry.score !== null
        ? {
            kind: 'asserted',
            seal: entry.seal,
            score: entry.score,
            radiusFraction: radiusOf(entry.seal),
          }
        : entry !== undefined && entry.score !== null && entry.seal === null
          ? { kind: 'ranked', score: entry.score }
          : objective.questions.every((q) => !scores(q.defaultMateriality))
            ? { kind: 'informational' }
            : { kind: 'unanswered' };
    const stands =
      standing.kind === 'asserted'
        ? `SEAL-${standing.seal}`
        : standing.kind === 'ranked'
          ? 'ranked, not gated'
          : standing.kind === 'informational'
            ? 'informational'
            : 'not yet answered';
    return {
      id: objective.id,
      name: objective.name,
      weight: objective.weight,
      startFraction,
      endFraction,
      midFraction: (startFraction + endFraction) / 2,
      sub: `${objective.weight}% · ${stands}`,
      summary: [
        objective.name,
        objective.id,
        `${objective.weight}% of the score`,
        stands,
        ...(standing.kind === 'asserted' || standing.kind === 'ranked'
          ? [standing.score.toFixed(1)]
          : []),
      ].join(' · '),
      standing,
    };
  });

  return {
    arcs,
    rungs: workbook.sealLevels
      .map((level) => ({ seal: level.seal, radiusFraction: radiusOf(level.seal) }))
      .sort((a, b) => a.seal - b.seal),
    headline: headlineOf(arcs),
    caption: CAPTION,
  };
}

/** The tile's answer in words: the heaviest objective held at the lowest standing
 *  — where weakness coincides with leverage (analytics §4.5). */
function headlineOf(arcs: ObjectiveArc[]): string {
  const asserted = arcs.flatMap((arc) =>
    arc.standing.kind === 'asserted' ? [{ arc, seal: arc.standing.seal }] : [],
  );
  if (asserted.length === 0) return NOTHING_ASSERTED;
  const worst = asserted.reduce((lowest, a) => (a.seal < lowest ? a.seal : lowest), 4 as number);
  const heaviest = asserted
    .filter((a) => a.seal === worst)
    .reduce((max, a) => (a.arc.weight > max.arc.weight ? a : max));
  return `${heaviest.arc.name} carries ${heaviest.arc.weight}% of the score at SEAL-${worst}.`;
}

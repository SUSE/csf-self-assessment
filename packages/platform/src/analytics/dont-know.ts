import type { Party, Workbook } from '../schema';
import type { EngineResult } from '../score-engine';
import { targetKey } from '../assessment';
import { targetLabel } from '../utils/target-label';

// One admitted unknown, at unit grain.
export type DontKnowRow = {
  // `<questionId>|<targetKey(target)>`.
  key: string;
  questionId: string;
  questionText: string;
  // What the unit is asked about — the staircase row's `label`, so a rail can
  // state the target and the role at whatever level holds each.
  label: string;
  roleName: string;
  // True when this unit would gate the floor: a floor **hole**, not merely an
  // admitted unknown.
  gatesFloor: boolean;
};

export type DontKnowTile =
  | {
    kind: 'admitted';
    // `result.floorHoles.length`.
    holes: number;
    // Don't-know UNITS — identically `result.units.dontKnow`. Never
    // `overall.dontKnowCount` (decision 2).
    total: number;
    // `1 of 2 don't-know answers gates the floor.`
    headline: string;
    caption: string;
    // Units carrying an answer of any state (the ribbon's `placed`) — the base the
    // admissions are marked against, so a lone admission reads as the sliver of the
    // reading it is.
    placed: number;
    // Floor holes first, then the rest; engine fact order within each.
    rows: DontKnowRow[];
  }
  // Nothing admitted. The base still reads, so the tile draws the same band with no
  // mark on it rather than falling back to a sentence.
  | { kind: 'none'; placed: number; reason: string };

const CAPTION =
  "A floor hole is a don't-know on a unit that would gate — which is why the floor is an upper bound, not a reading. The rest move no number.";

export function dontKnowTile(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): DontKnowTile {
  // The base is every unit carrying an answer of ANY state, don't-knows included —
  // the ribbon's `placed`, not `units.answered`, which counts the sealed ones alone.
  const placed = result.units.total - result.units.unanswered;
  const admitted = result.facts.filter((f) => f.state === 'dont-know');
  if (admitted.length === 0) {
    return {
      kind: 'none',
      placed,
      // The tile's own em-dash reading says "nothing admitted"; this says why that is
      // not the same fact as nothing being asked.
      reason: "A blank is not a don't-know; it is still open.",
    };
  }

  const questions = new Map(
    workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q.text]),
  );
  const holeKeys = new Set(result.floorHoles.map((h) => `${h.questionId}|${targetKey(h.target)}`));

  const rows: DontKnowRow[] = admitted.map((fact) => {
    const key = `${fact.questionId}|${targetKey(fact.target)}`;
    return {
      key,
      questionId: fact.questionId,
      questionText: questions.get(fact.questionId) ?? fact.questionId,
      label: targetLabel(workbook, parties, fact.target),
      roleName: workbook.roles.find((r) => r.id === fact.role)?.name ?? fact.role,
      gatesFloor: holeKeys.has(key),
    };
  });

  const holes = result.floorHoles.length;
  const total = admitted.length;

  return {
    kind: 'admitted',
    holes,
    total,
    headline: `${holes} of ${total} don't-know ${total === 1 ? 'answer' : 'answers'} ${holes === 1 ? 'gates' : 'gate'
      } the floor.`,
    caption: CAPTION,
    placed,
    rows: [...rows.filter((r) => r.gatesFloor), ...rows.filter((r) => !r.gatesFloor)],
  };
}

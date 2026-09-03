import type { LandingChecks } from '../../merge';
import type { Seal } from '../../schema';
import { minSeal } from '../../score-engine';

// The reading of `LandingChecks` the panel renders. Grouping and ordering are
// PRESENTATION, so they live here rather than in the merge core (invariant #13 —
// the component computes no truth); every number arrives from `landingChecks`
// and is only rearranged. Precedent: `mergeWheelModel` in ui/merge-wheel.

/** The two gates `canLand` reads. Everything else in the panel is recorded and
 *  blocks nothing (merge.md §4.2). */
export type Gates = { undecided: number; collisions: number };

/** One cell of the 0→4 scale. `now` = the previewed floor, the strip's only mark.
 *  Where lifting the bindings would land is `unlocksTo` below, said in words —
 *  a second mark on the strip only competed with the first. */
export type FloorCell = { seal: Seal; state: 'now' | 'plain' };

/** One estate axis and the gating answers sitting on it — the maximised reading.
 *  `worstSeal` is the lowest rung pinned on this axis. */
export type BindingLane = {
  key: string;
  label: string;
  worstSeal: Seal;
  questions: { questionId: string; seal: Seal }[];
};

export type LandingChecksView = {
  gates: Gates;
  /** True when a gate is live. Mirrors `canLand`'s condition from the panel's
   *  side, so the verdict sentence and the Land button can never disagree. */
  blocked: boolean;
  floor: {
    seal: Seal | null;
    unlocksTo: Seal | null;
    cells: FloorCell[];
  };
  /** The gating answers behind the previewed floor: how many there are, and over
   *  how many distinct questions and estate axes they sit. One question can gate
   *  several axes, so `answers` is the only one of the three that counts records. */
  pins: { answers: number; questions: number; targets: number };
  lanes: BindingLane[];
};

const RUNGS: Seal[] = [0, 1, 2, 3, 4];

export function landingChecksView(checks: LandingChecks, collisions: number): LandingChecksView {
  const { seal, unlocksTo, binding } = checks.floor;
  const lanes = new Map<string, BindingLane>();
  for (const b of binding) {
    const lane = lanes.get(b.targetKey);
    if (lane === undefined) {
      lanes.set(b.targetKey, {
        key: b.targetKey,
        label: b.label,
        worstSeal: b.seal,
        questions: [{ questionId: b.questionId, seal: b.seal }],
      });
      continue;
    }
    lane.worstSeal = minSeal([lane.worstSeal, b.seal]);
    lane.questions.push({ questionId: b.questionId, seal: b.seal });
  }
  return {
    gates: { undecided: checks.undecided, collisions },
    blocked: checks.undecided > 0 || collisions > 0,
    floor: {
      seal,
      unlocksTo,
      cells: RUNGS.map((rung) => ({
        seal: rung,
        state: rung === seal ? ('now' as const) : ('plain' as const),
      })),
    },
    pins: {
      answers: binding.length,
      questions: new Set(binding.map((b) => b.questionId)).size,
      targets: lanes.size,
    },
    // Worst rung first, then the axis carrying the most gating answers: the line
    // the facilitator reads first is the one holding the estate down hardest.
    lanes: [...lanes.values()].sort(
      (a, b) => a.worstSeal - b.worstSeal || b.questions.length - a.questions.length,
    ),
  };
}

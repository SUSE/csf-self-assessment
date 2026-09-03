import type { ClashResolution, EstateBase, Seal, Target, WorkbookAssessment } from '../schema';
import { assessmentOf, targetKey } from '../assessment';
import { evaluate } from '../score-engine';
import type { StaircaseBinding } from '../score-engine';
import { candidateProvenance } from './authority';
import type { LandingReview } from './review';
import { describeTarget } from './index';
import { applyOutcomes, landingOutcomes } from './land';

// The status checks over the landing under review (merge.md §4.2). Every number
// arrives from `evaluate` or from the pure merge core; this file does no floor
// arithmetic of its own (invariant #13).

/** One gating answer behind the previewed floor. `label` is resolved against the
 *  PROSPECTIVE roster, so a provider this landing adds reads by name and never
 *  as a raw id. `seal` is the rung this answer pins; `targetKey` identifies the
 *  estate axis it sits on, so a view can group the bindings without parsing the
 *  label prose back apart. */
export type FloorBinding = {
  questionId: string;
  label: string;
  seal: Seal;
  targetKey: string;
};

/** The floor the estate WOULD read if this landing were committed as decided so
 *  far — a preview, never the estate result and never a floor for the partial
 *  (invariant #11). `seal` null = nothing gates yet. `unlocksTo` is the floor the
 *  estate would read if every binding lifted above `seal` — the next gating level,
 *  or null when nothing else gates below the ceiling. */
export type FloorPreview = {
  seal: Seal | null;
  unlocksTo: Seal | null;
  binding: FloorBinding[];
};

/** The five status checks over the landing under review (merge.md §4.2). Every
 *  number arrives from `evaluate` or from the pure merge core; the panel
 *  computes none (invariant #13). */
export type LandingChecks = {
  floor: FloorPreview;
  /** Units carrying an answer of any state, of the units in scope — unit grain,
   *  from `EngineResult.units` (analytics invariant #8 bans the per-question
   *  `overall.answered/total` from every view). */
  coverage: { placed: number; total: number };
  /** Every in-scope don't-know — `overall.dontKnowCount`, verbatim. */
  dontKnow: number;
  /** Incoming answers given outside every claim their author made. A flag, not a
   *  refusal (merge.md §2.3.4). */
  outOfClaim: number;
  /** Clashes still undecided. Land is gated on this reaching zero. */
  undecided: number;
};

export function landingChecks(
  wa: WorkbookAssessment,
  base: EstateBase,
  review: LandingReview,
  resolutions: ClashResolution[],
): LandingChecks {
  const { outcomes, undecided } = landingOutcomes(review.units, resolutions);
  const prospective = applyOutcomes(base.answers, outcomes);
  // An in-memory evaluation vehicle on the AUTHOR_QA_PROVENANCE precedent: fed
  // straight to `evaluate`, never persisted, exported, or shown as a result.
  const vehicle = assessmentOf(wa.workbook, wa.meta.estate, review.parties, prospective, {
    kind: 'finalized',
    workbookAssessment: wa.meta.id,
    ledger: [],
  });
  const result = evaluate(wa.workbook, vehicle);
  const overall = result.overall;
  const roster: WorkbookAssessment = { ...wa, parties: review.parties };
  const step = result.staircase.find((s) => s.floor === overall.floor);
  const claims = review.incoming.claims ?? [];
  return {
    floor: {
      seal: overall.floor,
      unlocksTo: step?.unlocksTo ?? null,
      binding: (step?.binding ?? []).map((binding) => {
        const target = targetOf(binding);
        return {
          questionId: binding.questionId,
          label: describeTarget(target, roster),
          seal: binding.seal,
          targetKey: targetKey(target),
        };
      }),
    },
    coverage: { placed: result.units.total - result.units.unanswered, total: result.units.total },
    dontKnow: overall.dontKnowCount,
    outOfClaim: review.incoming.answers.filter(
      (answer) => candidateProvenance(wa.workbook, claims, answer).authority === 'out-of-claim',
    ).length,
    undecided: undecided.length,
  };
}

function targetOf(binding: StaircaseBinding): Target {
  if (binding.party !== null) return { kind: 'party', party: binding.party };
  if (binding.dimension === null) return { kind: 'assessment' };
  return binding.stratum === null
    ? { kind: 'dimension', dimension: binding.dimension }
    : { kind: 'dimension-stratum', dimension: binding.dimension, stratum: binding.stratum };
}

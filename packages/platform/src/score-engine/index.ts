// The scoring engine: one evaluate() over a workbook + assessment, emitting every
// number a view renders ( — no view recomputes truth). Two axes,
// computed independently and never mixed (docs/csf_scoring.md, ):
// • SEAL floor — the minimum over answered material answers that GATE.
// • Score — every answered scoring unit sweeps in, weighted per objective.
// A unit is eligible when it is answered, unanswered, don't-know or n/a on a
// question the workbook authors `material` or `ranking`. The
// eligibility table lives in objectives.ts; the two don't-know figures stay distinct — overall.unknowns
// is the FLOOR's holes (gating don't-knows), overall.dontKnowCount the honest grand
// total of every in-scope don't-know.
import type { Assessment, Seal, Workbook } from '../schema';
import { minSeal, scopeOf } from './scope';
export { gates, minSeal, sealName, scores } from './scope';
import { scoreObjectives } from './objectives';
import {
  credibilityOf,
  declaredDimensionsOf,
  declaredPartiesOf,
  exposureOf,
  staircaseOf,
} from './projections';
import { walkUnits } from './units';
import type { EngineResult } from './types';

export type {
  Credibility,
  DeclaredDimension,
  DeclaredParty,
  EngineResult,
  EvidenceCoverage,
  ExposureEdge,
  FloorHole,
  HeatCell,
  HeatFact,
  ObjectiveResult,
  OpenUnit,
  OverallResult,
  StaircaseBinding,
  StaircaseStep,
  StratumCell,
  UnitCoverage,
} from './types';

export function evaluate(workbook: Workbook, assessment: Assessment): EngineResult {
  const { answers, parties } = assessment;
  const scope = scopeOf(workbook, assessment);

  const scored = scoreObjectives(workbook, parties, answers, scope);
  const walk = walkUnits(workbook, parties, answers);
  const declaredParties = declaredPartiesOf(parties, scope);
  const credibility = credibilityOf(answers, assessment.ledger, scored.gating, scope);

  const objectiveSeals = scored.objectives.map((o) => o.seal).filter((s): s is Seal => s !== null);
  const floor = objectiveSeals.length ? minSeal(objectiveSeals) : null;

  return {
    overall: {
      floor,
      binding:
        floor === null
          ? []
          : [...new Set(scored.objectives.flatMap((o) => (o.seal === floor ? o.binding : [])))],
      unknowns: [...new Set(scored.objectives.flatMap((o) => o.unknowns))],
      score: walk.scoringAnswered && scored.ratio !== null ? scored.ratio * 100 : null,
      answered: walk.questions.answered,
      total: walk.questions.total,
      dontKnowCount: credibility.dontKnowCount,
    },
    objectives: scored.objectives,
    heatmap: scored.heatmap,
    declaredDimensions: declaredDimensionsOf(workbook, scope),
    declaredParties,
    staircase: staircaseOf(scored.gating),
    gating: scored.gating,
    floorHoles: scored.floorHoles,
    exposure: exposureOf(declaredParties, scored.gating),
    credibility,
    facts: walk.facts,
    units: walk.units,
    openUnits: walk.openUnits,
  };
}

// The scoring walk, per objective. Eligibility by (materiality, state), where
// scoring is `material` or `ranking` and only `material` may gate:
// scoring + answered → earned += rung.points; max += ladderMax; may gate
// scoring + unanswered → earned += 0; max += ladderMax; never gates
// scoring + don't-know → off earned AND max; a floor hole iff it would gate
// informational / n/a materiality / n/a answer → excluded entirely
// Score SWEEPS every unit; the floor GATES only where scope.gatesFloor says so.
// A split dimension is assessed per stratum — questionUnits() expands it, so the
// refinements supersede a lingering whole-dimension answer.
import type { Answer, Objective, Party, Seal, Workbook } from '../schema';
import { attainablePoints, findAnswer, questionUnits, rungIn } from '../assessment';
import { facetsOf, gates, minSeal, provenanceOf, scores, type Scope } from './scope';
import type { FloorHole, HeatCell, ObjectiveResult, StaircaseBinding } from './types';

type CellAcc = {
  seal: Seal;
  placements: Set<'group' | 'individual'>;
  strata: Map<string, CellAcc>;
};

function foldCell(
  cells: Map<string, CellAcc>,
  dimension: string,
  seal: Seal,
  placement: 'group' | 'individual',
  stratum: string | null,
): void {
  const cell = cells.get(dimension) ?? {
    seal,
    placements: new Set<'group' | 'individual'>(),
    strata: new Map<string, CellAcc>(),
  };
  cells.set(dimension, cell);
  if (seal < cell.seal) cell.seal = seal;
  cell.placements.add(placement);
  if (stratum === null) return;
  const acc = cell.strata.get(stratum) ?? {
    seal,
    placements: new Set<'group' | 'individual'>(),
    strata: new Map<string, CellAcc>(),
  };
  cell.strata.set(stratum, acc);
  if (seal < acc.seal) acc.seal = seal;
  acc.placements.add(placement);
}

export type ObjectiveScoring = {
  objectives: ObjectiveResult[];
  heatmap: HeatCell[];
  gating: StaircaseBinding[];
  floorHoles: FloorHole[];
  // Weighted mean of the per-objective ratios over the covered weight, kept raw
  // (no ×100 round-trip — the knife-edge audit scores depend on it).
  ratio: number | null;
};

type Instrument = {
  workbook: Workbook;
  parties: Party[];
  answers: Answer[];
  scope: Scope;
};

type Scored = {
  result: ObjectiveResult;
  ratio: number | null;
  heatmap: HeatCell[];
  gating: StaircaseBinding[];
  floorHoles: FloorHole[];
};

function scoreObjective(objective: Objective, instrument: Instrument): Scored {
  const { workbook, parties, answers, scope } = instrument;
  let earned = 0;
  let max = 0;
  const gating: StaircaseBinding[] = [];
  const floorHoles: FloorHole[] = [];
  const cells = new Map<string, CellAcc>();

  for (const question of objective.questions) {
    if (!scores(question.defaultMateriality)) continue;
    const mayGate = gates(question.defaultMateriality);
    const ladderMax = attainablePoints(question);

    for (const target of questionUnits(workbook, parties, answers, question)) {
      if (!scope.scoresTarget(target)) continue;
      const answer = findAnswer(answers, question.id, target);
      const where = { questionId: question.id, objectiveId: objective.id, role: question.role };

      if (answer === undefined) {
        max += ladderMax;
        continue;
      }
      if (answer.state === 'na') continue;
      if (answer.state === 'dont-know') {
        if (mayGate && scope.gatesFloor(target)) floorHoles.push({ ...where, target });
        continue;
      }

      const rung = rungIn(question, answer.rungId);
      if (rung === undefined) {
        // Unreachable for a parsed assessment (R5 plus the AssessmentSchema rung
        // refusal); reading it as unanswered never invents a score.
        max += ladderMax;
        continue;
      }
      earned += rung.points;
      max += ladderMax;
      const facets = facetsOf(target);
      if (mayGate && scope.gatesFloor(target)) {
        gating.push({ ...where, ...facets, seal: rung.seal, evidence: answer.evidence ?? null });
      }
      if (facets.dimension !== null) {
        foldCell(cells, facets.dimension, rung.seal, answer.gesture.placement, facets.stratum);
      }
    }
  }

  const seal = gating.length ? minSeal(gating.map((b) => b.seal)) : null;
  const ratio = max > 0 ? earned / max : null;

  return {
    result: {
      id: objective.id,
      seal,
      binding:
        seal === null
          ? []
          : [...new Set(gating.filter((b) => b.seal === seal).map((b) => b.questionId))],
      unknowns: [...new Set(floorHoles.map((h) => h.questionId))],
      score: ratio === null ? null : ratio * 100,
      // Don't-know density for the lens: the grand-total rule, localised to this
      // objective's questions.
      dontKnowCount: dontKnowsOn(objective, answers, scope),
    },
    ratio,
    heatmap: heatCellsOf(objective.id, cells, scope),
    gating,
    floorHoles,
  };
}

function dontKnowsOn(objective: Objective, answers: Answer[], scope: Scope): number {
  const ids = new Set(objective.questions.map((q) => q.id));
  return answers.filter((a) => a.state === 'dont-know' && ids.has(a.questionId) && scope.inScope(a))
    .length;
}

function heatCellsOf(objectiveId: string, cells: Map<string, CellAcc>, scope: Scope): HeatCell[] {
  return [...cells].map(([dimension, cell]) => ({
    objective: objectiveId,
    dimension,
    seal: cell.seal,
    provenance: provenanceOf(cell.placements),
    // Asserted strata only ( — no painting), in workbook order.
    strata: scope.strataOf(dimension).flatMap((stratum) => {
      const acc = cell.strata.get(stratum);
      return acc ? [{ stratum, seal: acc.seal, provenance: provenanceOf(acc.placements) }] : [];
    }),
  }));
}

export function scoreObjectives(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  scope: Scope,
): ObjectiveScoring {
  const instrument: Instrument = { workbook, parties, answers, scope };
  const scored = workbook.objectives.map((objective) => scoreObjective(objective, instrument));

  let weighted = 0;
  let covered = 0;
  workbook.objectives.forEach((objective, i) => {
    const ratio = scored[i].ratio;
    if (ratio === null) return;
    weighted += ratio * objective.weight;
    covered += objective.weight;
  });

  return {
    objectives: scored.map((s) => s.result),
    heatmap: scored.flatMap((s) => s.heatmap),
    gating: scored.flatMap((s) => s.gating),
    floorHoles: scored.flatMap((s) => s.floorHoles),
    ratio: covered > 0 ? weighted / covered : null,
  };
}

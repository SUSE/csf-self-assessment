import type { Role, Workbook } from '../schema';
import { gates } from '../score-engine/scope';

// Author HUD v1 (spec §4.3c): the STRUCTURAL gauges — budget, coverage grid,
// role readout, gate list — pure counts over the workbook definition,
// recomputed on every edit. Inputs are Workbook-TYPED but only draft-valid;
// everything here tolerates empty arrays, empty strings, and dangling
// appliesTo references. Quality gauges (duplicate radar, ladder lint, test
// estates) live in similarity.ts / lint.ts / estates.ts (S9b).

// Budget heuristics. Deliberately crude: the gauge exists to make a
// workbook's workshop cost VISIBLE while authoring, not to schedule the
// workshop. Answer units count every dimension (all in scope now) plus the
// graceful-default two parties. Revisit with field data (S11).
export const QUESTION_TARGET = 40; // spec §1: 30–40 question interactions
export const MINUTES_TARGET = 90; // spec §9 S11: a real workshop fits 90 min
export const MINUTES_FIRST_UNIT = 2; // one considered answer, in the room
export const MINUTES_EXTRA_UNIT = 0.5; // each further chip in the same gesture
export const DEFAULT_PARTY_COUNT = 2; // institution + primary provider

export type BudgetGauge = {
  questionCount: number;
  questionTarget: number;
  answerUnits: number;
  estimatedMinutes: number;
  minutesTarget: number;
};

export type CoverageCell = {
  objectiveId: string;
  dimensionId: string;
  count: number;
};

// Coverage of the DEFINITION: every appliesTo dimension counts, declared by
// default or not — an author must see that Edge's only question lives in
// SOV-4 even though Edge ships undeclared. `cells` holds count > 0 only;
// `uncoveredDimensions` (zero questions anywhere) is the glow (audit F-7/D4).
export type CoverageGauge = {
  objectiveIds: string[];
  dimensionIds: string[];
  cells: CoverageCell[];
  uncoveredDimensions: string[];
};

export type RoleLoad = {
  role: Role;
  questionCount: number;
  estimatedMinutes: number;
};

// The role READOUT (docs/specs/roles.md §4): question count + estimated
// minutes per authored role, in workbook order. Informational only — it makes
// workshop load visible but flags nothing missing/overloaded/unbalanced
// (invariant #6). Distribution is a downstream fact of the questions that
// exist, not a target. Replaces the retired role-BALANCE verdict (ADR-0003).
export type RoleReadout = {
  loads: RoleLoad[]; // one per authored role, in workbook order
};

// How a material question can floor the whole assessment (audit D7): a
// party-grain question gates through party answers; a dimension-grain
// question gates through its critical dimensions (the firm authored flag).
// Questions whose appliesTo meets no critical dimension produce no entry.
export type GateVia =
  | { kind: 'party' }
  | { kind: 'dimension'; dimensions: string[] };

export type GateEntry = {
  questionId: string;
  objectiveId: string;
  role: Role;
  text: string;
  via: GateVia;
};

export type AuthorGauges = {
  budget: BudgetGauge;
  coverage: CoverageGauge;
  roleReadout: RoleReadout;
  gateList: GateEntry[];
};

export function authorGauges(workbook: Workbook): AuthorGauges {
  const critical = new Set(workbook.dimensions.filter((d) => d.critical).map((d) => d.id));

  let questionCount = 0;
  let answerUnits = 0;
  let estimatedMinutes = 0;
  const byRole = new Map<Role, { questionCount: number; estimatedMinutes: number }>(
    workbook.roles.map((r) => [r.id, { questionCount: 0, estimatedMinutes: 0 }]),
  );
  // objective id → dimension id → question count.
  const counts = new Map<string, Map<string, number>>();
  const gateList: GateEntry[] = [];

  for (const objective of workbook.objectives) {
    const row = counts.get(objective.id) ?? new Map<string, number>();
    counts.set(objective.id, row);
    for (const question of objective.questions) {
      questionCount += 1;
      const units =
        question.grain === 'party'
          ? question.axis === 'party'
            ? DEFAULT_PARTY_COUNT
            : 1
          : question.appliesTo.length;
      const minutes =
        units === 0 ? 0 : MINUTES_FIRST_UNIT + MINUTES_EXTRA_UNIT * (units - 1);
      answerUnits += units;
      estimatedMinutes += minutes;
      const load = byRole.get(question.role);
      if (load) {
        load.questionCount += 1;
        load.estimatedMinutes += minutes;
      }
      if (question.grain === 'dimension') {
        for (const d of question.appliesTo) row.set(d, (row.get(d) ?? 0) + 1);
      }
      if (gates(question.defaultMateriality)) {
        if (question.grain === 'party') {
          gateList.push({
            questionId: question.id,
            objectiveId: objective.id,
            role: question.role,
            text: question.text,
            via: { kind: 'party' },
          });
        } else {
          const dimensions = question.appliesTo.filter((d) => critical.has(d));
          if (dimensions.length > 0) {
            gateList.push({
              questionId: question.id,
              objectiveId: objective.id,
              role: question.role,
              text: question.text,
              via: { kind: 'dimension', dimensions },
            });
          }
        }
      }
    }
  }

  const cells: CoverageCell[] = [];
  const coveredTotals = new Map<string, number>();
  for (const objective of workbook.objectives) {
    const row = counts.get(objective.id);
    if (!row) continue;
    for (const dimension of workbook.dimensions) {
      const count = row.get(dimension.id) ?? 0;
      if (count > 0) {
        cells.push({ objectiveId: objective.id, dimensionId: dimension.id, count });
        coveredTotals.set(dimension.id, (coveredTotals.get(dimension.id) ?? 0) + count);
      }
    }
  }
  const uncoveredDimensions = workbook.dimensions
    .filter((d) => (coveredTotals.get(d.id) ?? 0) === 0)
    .map((d) => d.id);

  const loads: RoleLoad[] = workbook.roles.map((r) => {
    const l = byRole.get(r.id);
    return {
      role: r.id,
      questionCount: l?.questionCount ?? 0,
      estimatedMinutes: l?.estimatedMinutes ?? 0,
    };
  });

  return {
    budget: {
      questionCount,
      questionTarget: QUESTION_TARGET,
      answerUnits,
      estimatedMinutes,
      minutesTarget: MINUTES_TARGET,
    },
    coverage: {
      objectiveIds: workbook.objectives.map((o) => o.id),
      dimensionIds: workbook.dimensions.map((d) => d.id),
      cells,
      uncoveredDimensions,
    },
    roleReadout: { loads },
    gateList,
  };
}

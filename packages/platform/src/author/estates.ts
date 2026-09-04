import type { Answer, Assessment, Seal, Target, TestEstate, Workbook } from '../schema';
import { answerFor, assessmentOf, AUTHOR_QA_PROVENANCE } from '../assessment';
import { evaluate } from '../score-engine';
import type { EngineResult, OverallResult, UnitCoverage } from '../score-engine';

// Test estates, evaluated live: expand each
// estate's sparse per-question answers into real Answer rows over the whole
// workbook (every dimension in scope) and its own parties, run the REAL engine,
// surface floor + score. One uniformity claim per question (placement 'group') —
// a test estate has no reason to peel exceptions. A question with no entry
// expands to nothing: in the score's denominator, never the floor.
// One test estate run through the real engine — the whole input the Author QA
// surfaces take (analytics §3.4). It carries the ASSESSMENT rather than a
// separate roster: the Report needs the assessment and `parties` is
// read off it, so the two can never drift.
export type TestEstateEvaluation = {
  estateId: string;
  name: string;
  assessment: Assessment;
  result: EngineResult;
};

// The Author HUD's per-estate readout. Coverage is unit-grain: the per-question
// `overall.answered/total` reaches no view.
export type TestEstateReading = {
  estateId: string;
  name: string;
  overall: OverallResult;
  units: UnitCoverage;
};

export type EstateFloorFlip = {
  estateId: string;
  name: string;
  from: Seal | null;
  to: Seal | null;
};

export function estateAnswers(workbook: Workbook, estate: TestEstate): Answer[] {
  const rungIdByQuestion = new Map(estate.answers.map((a) => [a.questionId, a.rungId]));
  const out: Answer[] = [];
  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      const rungId = rungIdByQuestion.get(question.id);
      if (rungId === undefined) continue;
      if (!question.ladder.some((candidate) => candidate.id === rungId)) continue;
      const targets: Target[] =
        question.grain === 'party'
          ? question.axis === 'assessment'
            ? [{ kind: 'assessment' }]
            : estate.parties.map((p) => ({ kind: 'party', party: p.id }))
          : question.appliesTo.map((d) => ({ kind: 'dimension', dimension: d }));
      const gesture = { groupId: `estate:${estate.id}:${question.id}`, placement: 'group' as const };
      for (const target of targets) {
        out.push(answerFor(question.id, target, { state: 'answered', rungId }, gesture));
      }
    }
  }
  return out;
}

export function evaluateTestEstate(workbook: Workbook, estate: TestEstate): TestEstateEvaluation {
  const assessment = assessmentOf(
    workbook,
    estate.name,
    estate.parties,
    estateAnswers(workbook, estate),
    AUTHOR_QA_PROVENANCE,
  );
  return {
    estateId: estate.id,
    name: estate.name,
    assessment,
    result: evaluate(workbook, assessment),
  };
}

export function testEstateReadings(workbook: Workbook): TestEstateReading[] {
  return workbook.testEstates.map((estate) => {
    const { estateId, name, result } = evaluateTestEstate(workbook, estate);
    return { estateId, name, overall: result.overall, units: result.units };
  });
}

// The announcement's data ("a change that flips a profile's floor announces
// itself"): estates present in BOTH lists whose floor changed. Added/removed
// estates are not flips.
export function estateFloorFlips(
  prev: TestEstateReading[],
  next: TestEstateReading[],
): EstateFloorFlip[] {
  const before = new Map(prev.map((r) => [r.estateId, r.overall.floor]));
  return next
    .filter((r) => before.has(r.estateId) && before.get(r.estateId) !== r.overall.floor)
    .map((r) => ({
      estateId: r.estateId,
      name: r.name,
      from: before.get(r.estateId) ?? null,
      to: r.overall.floor,
    }));
}

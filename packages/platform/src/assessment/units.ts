import type { Answer, Party, Question, Target, Workbook } from '../schema';
import { findAnswer } from './answers';
import { applicableDimensionsOf, applicableParties, strataOf } from './placement';

// The interaction units a question fans out over: one per applicable dimension (a
// split dimension expands to its strata), one per party, or the single assessment
// target.
export function questionUnits(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
): Target[] {
  if (question.grain === 'dimension') {
    return applicableDimensionsOf(question).flatMap((dimension): Target[] => {
      const strata = strataOf(workbook, dimension);
      const split = strata.some(
        (stratum) => findAnswer(answers, question.id, { kind: 'dimension-stratum', dimension, stratum }) !== undefined,
      );
      return split
        ? strata.map((stratum) => ({ kind: 'dimension-stratum', dimension, stratum }))
        : [{ kind: 'dimension', dimension }];
    });
  }
  if (question.axis === 'party') {
    return applicableParties(parties).map((party) => ({ kind: 'party', party }));
  }
  return [{ kind: 'assessment' }];
}

// Navigator "have you dealt with it": how many units carry a recorded answer of ANY
// state (a deliberate n/a counts). Intentionally looser than the engine's
// completeness, which requires every unit answered.
export type QuestionCoverage = 'inapplicable' | 'unanswered' | 'partial' | 'answered';

export function questionCoverage(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
): QuestionCoverage {
  const units = questionUnits(workbook, parties, answers, question);
  if (units.length === 0) return 'inapplicable';
  const resolved = units.filter((t) => findAnswer(answers, question.id, t) !== undefined).length;
  if (resolved === 0) return 'unanswered';
  return resolved === units.length ? 'answered' : 'partial';
}

// The richer twin for the navigator tick: the same status plus placed/total (fill to
// the real fraction) and hasDontKnow/hasNa (surface an unknown or an exclusion).
export type QuestionCoverageDetail = {
  status: QuestionCoverage;
  placed: number;
  total: number;
  hasDontKnow: boolean;
  hasNa: boolean;
};

export function questionCoverageDetail(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  question: Question,
): QuestionCoverageDetail {
  const units = questionUnits(workbook, parties, answers, question);
  const unitAnswers = units.map((t) => findAnswer(answers, question.id, t));
  const total = units.length;
  const placed = unitAnswers.filter((a) => a !== undefined).length;
  const hasDontKnow = unitAnswers.some((a) => a?.state === 'dont-know');
  const hasNa = unitAnswers.some((a) => a?.state === 'na');
  const status: QuestionCoverage =
    total === 0 ? 'inapplicable' : placed === 0 ? 'unanswered' : placed === total ? 'answered' : 'partial';
  return { status, placed, total, hasDontKnow, hasNa };
}

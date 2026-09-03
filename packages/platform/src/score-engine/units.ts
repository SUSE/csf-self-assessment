// One walk of questionUnits() for every non-scoring output, so the counts, the
// facts and the open list cannot disagree.
import type { Answer, Party, Workbook } from '../schema';
import { findAnswer, questionUnits, sealOfAnswer } from '../assessment';
import { facetsOf, scores } from './scope';
import type { HeatFact, OpenUnit, UnitCoverage } from './types';

export type UnitWalk = {
  facts: HeatFact[];
  units: UnitCoverage;
  openUnits: OpenUnit[];
  // Progress in question-interaction terms: a question is answerable with ≥1 unit
  // and complete when every unit is answered.
  questions: { total: number; answered: number };
  // "Nothing SCORING answered" is not-assessed, not zero (csf_scoring.md
  // §13.1). Counts a `material` or a `ranking` answer — the score's guard is
  // not the floor's. Renamed from `materialAnswered`.
  scoringAnswered: boolean;
};

export function walkUnits(workbook: Workbook, parties: Party[], answers: Answer[]): UnitWalk {
  const facts: HeatFact[] = [];
  const openUnits: OpenUnit[] = [];
  const units: UnitCoverage = { total: 0, answered: 0, dontKnow: 0, na: 0, unanswered: 0 };
  const questions = { total: 0, answered: 0 };
  let scoringAnswered = false;

  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      const targets = questionUnits(workbook, parties, answers, question);
      if (targets.length === 0) continue;
      const materiality = question.defaultMateriality;
      let allAnswered = true;

      for (const target of targets) {
        units.total += 1;
        const answer = findAnswer(answers, question.id, target);
        if (answer === undefined) {
          units.unanswered += 1;
          allAnswered = false;
          openUnits.push({
            questionId: question.id,
            objectiveId: objective.id,
            role: question.role,
            target,
            materiality,
          });
          continue;
        }
        if (answer.state === 'answered') {
          units.answered += 1;
          if (scores(materiality)) scoringAnswered = true;
        } else {
          allAnswered = false;
          if (answer.state === 'dont-know') units.dontKnow += 1;
          else units.na += 1;
        }
        facts.push({
          objective: objective.id,
          questionId: question.id,
          role: question.role,
          target,
          ...facetsOf(target),
          state: answer.state,
          seal: sealOfAnswer(question, answer),
          materiality,
          swept: answer.gesture.placement === 'group',
          evidence: answer.state === 'answered' && answer.evidence !== undefined,
        });
      }

      questions.total += 1;
      if (allAnswered) questions.answered += 1;
    }
  }

  return { facts, units, openUnits, questions, scoringAnswered };
}

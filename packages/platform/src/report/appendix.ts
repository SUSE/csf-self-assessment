import { findAnswer } from '../assessment';
import type { Answer, Assessment, Gesture, Materiality, Party, Question, Seal, Workbook } from '../schema';
import type { EngineResult, HeatFact, OpenUnit } from '../score-engine';
import { answerLabel } from '../utils/answer-label';
import { targetLabel } from '../utils/target-label';

/** The four states one unit can print in: the three the engine asserts in
 *  `facts[]`, plus `unanswered` for an `openUnits` entry. */
export type AppendixState = 'answered' | 'dont-know' | 'na' | 'unanswered';

/** One unit of the transcript (report.md §2.4, ADR-0019).
 *
 *  Deliberately a FLAT record, not a discriminated union: `HeatFact.seal` is
 *  nullable across all three asserted states, so an `{ state: 'answered'; seal:
 *  Seal }` arm could only be built through a non-null assertion the quality
 *  rules forbid. `ReadingView` (ui/inspector/question-blocks.ts) and
 *  `HeatDetailRow` (analytics/heat.ts) are the settled precedent for mirroring
 *  the engine's own looseness here. */
export type AppendixRow = {
  /** The unit's target as a human reads it — `utils/target-label`. */
  targetLabel: string;
  state: AppendixState;
  /** As ASSERTED, copied from `HeatFact.seal`; null on every other state, and
   *  never rendered as SEAL-0 (analytics inv #2). */
  seal: Seal | null;
  /** The gesture behind the assertion, from `HeatFact.swept`; null when the unit
   *  is unanswered — there is no gesture to report. */
  placement: Gesture['placement'] | null;
  /** The evidence note the participant typed, from `answers` (ADR-0019); null
   *  when none was recorded or this unit is not `answered`. */
  evidence: string | null;
  /** The n/a exclusion reason, from `answers` (ADR-0019); null unless this unit
   *  is an `na` carrying one. */
  reason: string | null;
  /** `“Verified.” (SEAL 3)` / `don’t know` / `n/a` / `unanswered` — the words. */
  label: string;
};

/** One question's units. `roleName` and `materiality` sit HERE, not on the row: a
 *  question has one authored role and one materiality, so neither can ever tell
 *  its units apart (ui/inspector/question-blocks.ts states the same reason). */
export type AppendixQuestion = {
  questionId: string;
  questionText: string;
  /** The authored role's display NAME, resolved from `workbook.roles` with an id
   *  fallback (ADR-0003) — `whats-left.ts`'s spelling. */
  roleName: string;
  /** The question's authored materiality, read off the engine's own per-unit
   *  field, never re-derived from `defaultMateriality`. Replaces `material`. */
  materiality: Materiality;
  /** Asserted units in `facts[]` order, then unanswered units in `openUnits`
   *  order. Never empty. */
  rows: AppendixRow[];
};

/** One objective's questions, in authored order. A question `questionUnits()`
 *  produced no unit for, and an objective left with no such question, do not
 *  appear — there is nothing to transcribe. */
export type AppendixObjective = {
  id: string;
  name: string;
  questions: AppendixQuestion[];
};

// The words for a unit whose answer the assessment does not carry. The three
// states here have no rung to name; `answered` is not among them, because an
// answered row reads its own answer through `answerLabel`.
const UNSEALED_LABEL: Record<Exclude<AppendixState, 'answered'>, string> = {
  'dont-know': 'don’t know',
  na: 'n/a',
  unanswered: 'unanswered',
};

/** One asserted unit: structure from the fact, prose and the rung it names from
 *  the matched answer. */
function assertedRow(
  fact: HeatFact,
  question: Pick<Question, 'ladder'>,
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
): AppendixRow {
  const answer = findAnswer(answers, fact.questionId, fact.target);
  return {
    targetLabel: targetLabel(workbook, parties, fact.target),
    state: fact.state,
    seal: fact.seal,
    placement: fact.swept ? 'group' : 'individual',
    evidence: answer?.state === 'answered' ? (answer.evidence ?? null) : null,
    reason: answer?.state === 'na' ? (answer.reason ?? null) : null,
    label:
      answer === undefined
        ? UNSEALED_LABEL[fact.state === 'answered' ? 'unanswered' : fact.state]
        : answerLabel(question, answer),
  };
}

/** One open unit: no seal, no gesture, no prose — that is what open means. */
function openRow(unit: OpenUnit, workbook: Workbook, parties: Party[]): AppendixRow {
  return {
    targetLabel: targetLabel(workbook, parties, unit.target),
    state: 'unanswered',
    seal: null,
    placement: null,
    evidence: null,
    reason: null,
    label: UNSEALED_LABEL['unanswered'],
  };
}

/** The transcript (ADR-0019): structure from `EngineResult`, prose from
 *  `answers`, and NOTHING aggregated — no total, no minimum, no percentage, no
 *  derived seal. Every number and every seal in the Report is `evaluate()`'s. */
export function reportAppendix(
  assessment: Assessment,
  result: EngineResult,
): AppendixObjective[] {
  const { workbook, parties, answers } = assessment;
  const roleNames = new Map(workbook.roles.map((role) => [role.id, role.name]));
  const appendix: AppendixObjective[] = [];

  workbook.objectives.forEach((objective) => {
    const questions: AppendixQuestion[] = [];

    objective.questions.forEach((question) => {
      const facts = result.facts.filter(
        (fact) => fact.objective === objective.id && fact.questionId === question.id,
      );
      const openUnits = result.openUnits.filter(
        (unit) => unit.objectiveId === objective.id && unit.questionId === question.id,
      );
      const firstUnit = facts[0] ?? openUnits[0];
      if (firstUnit === undefined) return;

      questions.push({
        questionId: question.id,
        questionText: question.text,
        roleName: roleNames.get(question.role) ?? question.role,
        materiality: firstUnit.materiality,
        rows: [
          ...facts.map((fact) => assertedRow(fact, question, workbook, parties, answers)),
          ...openUnits.map((unit) => openRow(unit, workbook, parties)),
        ],
      });
    });

    if (questions.length === 0) return;
    appendix.push({ id: objective.id, name: objective.name, questions });
  });

  return appendix;
}

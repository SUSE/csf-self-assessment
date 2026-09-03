import type { Answer, DimensionQuestion, Party, Question, Rung, Seal, Target, Workbook } from '../schema';
import { answerFor, findAnswer, setAnswer, setAnswers, type LadderChoice } from './answers';

// What a dimension card emits: one uniformity claim over the whole applicable group
// (split dimensions contribute their stratum chips, named in splitDimensions), one
// dimension chip, or one stratum chip (a peeled refinement).
export type Placement =
  | { kind: 'group'; choice: LadderChoice; splitDimensions: string[] }
  | { kind: 'individual'; dimension: string; choice: LadderChoice }
  | { kind: 'individual-stratum'; dimension: string; stratum: string; choice: LadderChoice };

// The party-axis twin of Placement: one claim over every declared party, or one
// peeled party chip.
export type PartyPlacement =
  | { kind: 'group'; choice: LadderChoice }
  | { kind: 'individual'; party: string; choice: LadderChoice };

// Every dimension a dimension-grain question applies to (validated against the
// workbook by schema rule R6). Named so callers read intent, not a bare field.
export function applicableDimensionsOf(question: DimensionQuestion): string[] {
  return question.appliesTo;
}

// The strata a dimension can split into ([] = unsplittable). A workbook fact.
export function strataOf(workbook: Workbook, dimensionId: string): string[] {
  return workbook.dimensions.find((d) => d.id === dimensionId)?.strata ?? [];
}

export function questionOf(workbook: Pick<Workbook, 'objectives'>, questionId: string): Question | undefined {
  for (const objective of workbook.objectives) {
    const question = objective.questions.find((q) => q.id === questionId);
    if (question !== undefined) return question;
  }
  return undefined;
}

/** The state-and-rung facts every answered value carries. An `Answer`, an
 *  `AnswerSnapshot` and a `LadderChoice` all satisfy it structurally, so one
 *  resolver serves standing answers, ledger snapshots and card emissions alike. */
export type AnswerValue =
  | { state: 'answered'; rungId: string }
  | { state: 'dont-know' }
  | { state: 'na' };

/** The rung a question authors under this id, or `undefined` when the id names
 *  no rung on that ladder (workbook rule R5 keeps ids unique within a question). */
export function rungIn(question: Pick<Question, 'ladder'>, rungId: string): Rung | undefined {
  return question.ladder.find((rung) => rung.id === rungId);
}

/** The rung at 1-based authored `position` — `1` is the ladder's bottom rung
 *  (ADR-0023). `undefined` past either end of the ladder, so a digit naming no
 *  rung is a no-op and never a nearest match. */
export function rungAtPosition(
  question: Pick<Question, 'ladder'>,
  position: number,
): Rung | undefined {
  return position < 1 ? undefined : question.ladder[position - 1];
}

/** `rungIn` reached through `questionOf` — for callers holding a workbook and an
 *  id rather than the question itself. */
export function rungOf(
  workbook: Pick<Workbook, 'objectives'>,
  questionId: string,
  rungId: string,
): Rung | undefined {
  const question = questionOf(workbook, questionId);
  return question === undefined ? undefined : rungIn(question, rungId);
}

/** The SEAL an answered value asserts, resolved from the embedded workbook;
 *  `null` for don't-know, n/a, and an unresolvable rung id. */
export function sealOfAnswer(question: Pick<Question, 'ladder'>, value: AnswerValue): Seal | null {
  if (value.state !== 'answered') return null;
  return rungIn(question, value.rungId)?.seal ?? null;
}

/** A ladder's attainable points: `max(rung.points)` (spec §2.3.4). Replaces
 *  `maxPointsForLadder`, which multiplied the top SEAL by 25. */
export function attainablePoints(question: Pick<Question, 'ladder'>): number {
  return Math.max(...question.ladder.map((rung) => rung.points));
}

// The dimensions a question holds stratum refinements for, in first-appearance
// order — the split state, derived from answers (invariant #2), never stored.
export function splitDimensionsOf(answers: Answer[], questionId: string): string[] {
  const dims: string[] = [];
  for (const a of answers) {
    if (a.questionId !== questionId || a.target.kind !== 'dimension-stratum') continue;
    if (!dims.includes(a.target.dimension)) dims.push(a.target.dimension);
  }
  return dims;
}

// Placing at dimension level retracts the strata beneath it; placing at stratum
// level retracts the whole-dimension answer. One (question, dimension) never holds
// both grains at once (invariant #2).
function dropSuperseded(
  answers: Answer[],
  questionId: string,
  dimension: string,
  placedAt: 'dimension' | 'stratum',
): Answer[] {
  return answers.filter((a) => {
    if (a.questionId !== questionId) return true;
    if (placedAt === 'dimension')
      return !(a.target.kind === 'dimension-stratum' && a.target.dimension === dimension);
    return !(a.target.kind === 'dimension' && a.target.dimension === dimension);
  });
}

// The one transition for a dimension-grain choice (spec §4.1): group fans the choice
// to every applicable dimension still UNPLACED (a resting chip is never disturbed —
// ADR-0008), splitting a named dimension into per-stratum answers; individual and
// individual-stratum peel one chip and retract the grain they supersede.
export function applyPlacement(
  answers: Answer[],
  question: DimensionQuestion,
  workbook: Workbook,
  placement: Placement,
  groupId: string,
): Answer[] {
  if (placement.kind === 'individual') {
    const next = answerFor(
      question.id,
      { kind: 'dimension', dimension: placement.dimension },
      placement.choice,
      { groupId, placement: 'individual' },
    );
    return setAnswer(dropSuperseded(answers, question.id, placement.dimension, 'dimension'), next);
  }
  if (placement.kind === 'individual-stratum') {
    const next = answerFor(
      question.id,
      { kind: 'dimension-stratum', dimension: placement.dimension, stratum: placement.stratum },
      placement.choice,
      { groupId, placement: 'individual' },
    );
    return setAnswer(dropSuperseded(answers, question.id, placement.dimension, 'stratum'), next);
  }
  const split = new Set(placement.splitDimensions);
  const placed: Answer[] = [];
  for (const dimension of applicableDimensionsOf(question)) {
    const strata = strataOf(workbook, dimension);
    const targets: Target[] =
      split.has(dimension) && strata.length > 0
        ? strata.map((stratum) => ({ kind: 'dimension-stratum', dimension, stratum }))
        : [{ kind: 'dimension', dimension }];
    for (const target of targets) {
      if (findAnswer(answers, question.id, target) === undefined) {
        placed.push(answerFor(question.id, target, placement.choice, { groupId, placement: 'group' }));
      }
    }
  }
  return setAnswers(answers, placed);
}

// Merge a split dimension back to one chip: retract every stratum refinement for
// (question, dimension). The dimension returns unanswered.
export function mergeStrata(answers: Answer[], questionId: string, dimension: string): Answer[] {
  return answers.filter(
    (a) => !(a.questionId === questionId && a.target.kind === 'dimension-stratum' && a.target.dimension === dimension),
  );
}

// A party-axis question fans over every party in seed order (no per-question
// applicability, unlike dimensions).
export function applicableParties(parties: Party[]): string[] {
  return parties.map((p) => p.id);
}

// Group gesture over the party axis: every UNPLACED party gets the same choice under
// one groupId, marked 'group'.
export function placeGroupParty(
  answers: Answer[],
  parties: Party[],
  questionId: string,
  choice: LadderChoice,
  groupId: string,
): Answer[] {
  const placed: Answer[] = [];
  for (const party of applicableParties(parties)) {
    const target: Target = { kind: 'party', party };
    if (findAnswer(answers, questionId, target) === undefined) {
      placed.push(answerFor(questionId, target, choice, { groupId, placement: 'group' }));
    }
  }
  return setAnswers(answers, placed);
}

// One provider peeled to its own choice, marked 'individual'.
export function placeIndividualParty(questionId: string, party: string, choice: LadderChoice, groupId: string): Answer {
  return answerFor(questionId, { kind: 'party', party }, choice, { groupId, placement: 'individual' });
}

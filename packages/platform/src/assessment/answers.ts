import type { Answer, Gesture, Target } from '../schema';

// What the LadderCard / fan-out card emits — a choice minus its (questionId,
// target, gesture) context, which placement supplies. `evidence` rides
// an answered choice only and attaches to every answer the gesture produces.
export type LadderChoice =
  | { state: 'answered'; rungId: string; evidence?: string }
  | { state: 'dont-know' }
  | { state: 'na'; reason?: string };

export function targetKey(target: Target): string {
  switch (target.kind) {
    case 'assessment':
      return 'assessment';
    case 'dimension':
      return `dimension:${target.dimension}`;
    case 'dimension-stratum':
      return `dimension-stratum:${target.dimension}:${target.stratum}`;
    case 'party':
      return `party:${target.party}`;
  }
}

// The evidence/reason keys are asserted or absent, never undefined (a JSON field
// is present or missing).
export function answerFor(
  questionId: string,
  target: Target,
  choice: LadderChoice,
  gesture: Gesture,
): Answer {
  switch (choice.state) {
    case 'answered':
      return choice.evidence === undefined
        ? { questionId, target, state: 'answered', rungId: choice.rungId, gesture }
        : { questionId, target, state: 'answered', rungId: choice.rungId, evidence: choice.evidence, gesture };
    case 'dont-know':
      return { questionId, target, state: 'dont-know', gesture };
    case 'na':
      return choice.reason === undefined
        ? { questionId, target, state: 'na', gesture }
        : { questionId, target, state: 'na', reason: choice.reason, gesture };
  }
}

// Rewrite the evidence note on every answered answer sharing (questionId, groupId)
// — a whole-group rewrite. Empty/whitespace drops the key.
// the groupId is preserved. Non-answered answers are left untouched.
export function setEvidence(answers: Answer[], questionId: string, groupId: string, note: string): Answer[] {
  const empty = note.trim() === '';
  return answers.map((a) => {
    if (a.questionId !== questionId || a.gesture.groupId !== groupId || a.state !== 'answered') return a;
    const choice: LadderChoice = empty ? { state: 'answered', rungId: a.rungId } : { state: 'answered', rungId: a.rungId, evidence: note };
    return answerFor(a.questionId, a.target, choice, a.gesture);
  });
}

// The na-twin of setEvidence: rewrite the reason on every
// 'na' answer sharing (questionId, groupId). Engine-invisible.
export function setNaReason(answers: Answer[], questionId: string, groupId: string, reason: string): Answer[] {
  const empty = reason.trim() === '';
  return answers.map((a) => {
    if (a.questionId !== questionId || a.gesture.groupId !== groupId || a.state !== 'na') return a;
    const choice: LadderChoice = empty ? { state: 'na' } : { state: 'na', reason };
    return answerFor(a.questionId, a.target, choice, a.gesture);
  });
}

export function findAnswer(answers: Answer[], questionId: string, target: Target): Answer | undefined {
  const key = targetKey(target);
  return answers.find((a) => a.questionId === questionId && targetKey(a.target) === key);
}

// Immutable upsert: replace the answer at the same (questionId, target), else append.
export function setAnswer(answers: Answer[], next: Answer): Answer[] {
  const key = targetKey(next.target);
  const i = answers.findIndex((a) => a.questionId === next.questionId && targetKey(a.target) === key);
  if (i === -1) return [...answers, next];
  const copy = [...answers];
  copy[i] = next;
  return copy;
}

// Batch upsert: fold each answer through setAnswer (a group placement).
export function setAnswers(answers: Answer[], next: Answer[]): Answer[] {
  return next.reduce(setAnswer, answers);
}

// Lift the one placed unit at (questionId, target) back to the tray.
// No-op when the target holds no answer. Immutable.
export function retractPlacement(answers: Answer[], questionId: string, target: Target): Answer[] {
  const key = targetKey(target);
  return answers.filter((a) => !(a.questionId === questionId && targetKey(a.target) === key));
}

// Reset one question to how it loaded: drop every answer at this questionId (all
// targets, groups, states). No-op when it holds none. Immutable.
export function clearQuestion(answers: Answer[], questionId: string): Answer[] {
  return answers.filter((a) => a.questionId !== questionId);
}

// The next fresh gesture group id: one past the highest existing g<n>. Deterministic
// (no Date.now/random) and collision-free after a load.
export function nextGroupId(answers: Answer[]): string {
  const max = answers.reduce((m, a) => {
    const match = /^g(\d+)$/.exec(a.gesture.groupId);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `g${max + 1}`;
}

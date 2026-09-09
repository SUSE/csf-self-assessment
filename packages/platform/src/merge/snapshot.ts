import type { Answer, AnswerSnapshot } from '../schema';

// The seam between a whole `Answer` (which carries its unit identity) and the
// unit-local snapshot a Landing record stores (landing-history §2.2.4).

export function snapshotOf(answer: Answer): AnswerSnapshot {
  switch (answer.state) {
    case 'answered':
      return answer.evidence === undefined
        ? { state: 'answered', rungId: answer.rungId, gesture: answer.gesture }
        : { state: 'answered', rungId: answer.rungId, evidence: answer.evidence, gesture: answer.gesture };
    case 'dont-know':
      return { state: 'dont-know', gesture: answer.gesture };
    case 'na':
      return answer.reason === undefined
        ? { state: 'na', gesture: answer.gesture }
        : { state: 'na', reason: answer.reason, gesture: answer.gesture };
  }
}

// Assessment-value equality (merge.md §2.2.9): state and, when answered, the
// same RUNG. Two rungs sharing a SEAL are different answers.
export function sameStanding(a: AnswerSnapshot | null, b: AnswerSnapshot | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.state !== b.state) return false;
  if (a.state === 'answered' && b.state === 'answered') return a.rungId === b.rungId;
  return true;
}

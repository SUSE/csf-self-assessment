import { describe, expect, it } from 'vitest';
import type { Answer, Authority, Claim, Question } from '../schema';
import { authorityOf } from './authority';
import { suggest, suggestedChoice } from './suggest';
import { ALEX, JANE, WA, janeClashes } from './estate-fixture';

const questionOf = (questionId: string): Question => {
  for (const objective of WA.workbook.objectives) {
    const question = objective.questions.find((q) => q.id === questionId);
    if (question !== undefined) return question;
  }
  throw new Error(`no such question: ${questionId}`);
};

const tally = (answers: Answer[], claims: Claim[]): Record<Authority, number> => {
  const counts: Record<Authority, number> = { owner: 0, blanket: 0, 'out-of-claim': 0 };
  for (const answer of answers) {
    counts[authorityOf(claims, questionOf(answer.questionId), answer.target)] += 1;
  }
  return counts;
};

describe('the authority ladder over the Alex/Jane pair', () => {
  it('the ladder reads the claims as written', () => {
    expect(tally(ALEX.answers, ALEX.claims ?? [])).toEqual({ owner: 0, blanket: 81, 'out-of-claim': 0 });
    // A well-formed partial has no `out-of-claim` — the walk is built from the
    // claims. That rung is exercised in suggest.test.ts and authority.test.ts.
    expect(tally(JANE.answers, JANE.claims ?? [])).toEqual({ owner: 28, blanket: 33, 'out-of-claim': 0 });
  });

  it('every clash shows both rungs', () => {
    const clashes = janeClashes();
    const unitClashes = clashes.filter((c) => c.kind === 'unit-clash');
    expect(unitClashes).toHaveLength(29);
    expect(unitClashes.every((c) => c.kind === 'unit-clash' && c.base.authority === 'blanket')).toBe(true);
    const incoming = unitClashes.map((c) => (c.kind === 'unit-clash' ? c.incoming.authority : null));
    expect(incoming.filter((a) => a === 'owner')).toHaveLength(14);
    expect(incoming.filter((a) => a === 'blanket')).toHaveLength(15);
    expect(incoming.filter((a) => a === 'out-of-claim')).toHaveLength(0);
    const grain = clashes.find((c) => c.kind === 'grain-clash');
    expect(grain?.kind === 'grain-clash' ? grain.rollUp.authority : null).toBe('blanket');
  });

  it('the ladder suggests 11 to Jane, 3 to Alex, and ties on 9', () => {
    const clashes = janeClashes();
    const divergences = clashes.filter((c) => c.clash === 'divergence');
    expect(divergences).toHaveLength(23);
    const keys = divergences.map((c) => suggest(c)?.key ?? null);
    expect(keys.filter((k) => k === 'take:Jane')).toHaveLength(11);
    // Both sides answer under a blanket claim on the other 12, so the ladder
    // falls through to the evidence tiebreak: Alex carries evidence on 3.
    expect(keys.filter((k) => k === 'take:Alex')).toHaveLength(3);
    // The last 9 tie on both rungs, so `suggest` returns null
    // and the facilitator decides. A suggestion is never a decision.
    expect(keys.filter((k) => k === null)).toHaveLength(9);

    // gap, scope and grain always suggest, so 21 of the 30 carry one.
    expect(clashes.filter((c) => suggest(c) !== null)).toHaveLength(21);
    const reasons = clashes.map((c) => suggestedChoice(c, WA)?.reason ?? '');
    expect(reasons.filter((r) => r.startsWith('Jane’s claim names '))).toHaveLength(11);
    expect(reasons.filter((r) => r === 'Alex attached evidence')).toHaveLength(3);
    expect(reasons.filter((r) => r === 'outside Jane’s claims')).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import type { Seal } from '../schema';
import { targetKey } from '../assessment';
import { reviewLanding } from './review';
import { applyOutcomes, landingOutcomes } from './land';
import { SECURITY, STORAGE, afterAlex, answered, onParty, partial, stratum } from './synthetic-fixture';

// Alex holds storage and security; Jane agrees on storage, diverges on security, brings one new unit.
const mixedReview = () => {
  const alex = afterAlex();
  const jane = partial('Jane', [onParty('inst', 2), answered(STORAGE, 2), answered(SECURITY, 4)]);
  return reviewLanding(alex.base, alex.ledger, jane, []);
};

describe('landingOutcomes', () => {
  it('an undecided clash is omitted from the outcomes', () => {
    const { outcomes, undecided } = landingOutcomes(mixedReview().units, []);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[0].decision).toEqual({ kind: 'sole-source', from: 'Jane' });
    expect(outcomes[1].decision).toEqual({ kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Alex' });
    expect(undecided).toHaveLength(1);
    expect(undecided[0].questionId).toBe('SOV-1.dq');
  });

  it('a decided clash becomes an outcome carrying its decision', () => {
    const choice = { kind: 'take' as const, from: 'Jane' };
    const { outcomes, undecided } = landingOutcomes(mixedReview().units, [
      { questionId: 'SOV-1.dq', target: SECURITY, choice, note: '' },
    ]);
    expect(outcomes).toHaveLength(3);
    expect(undecided).toEqual([]);
    expect(outcomes[2].decision).toEqual({
      kind: 'resolved',
      clash: 'divergence',
      choice,
      by: 'facilitator',
      note: '',
    });
  });

  it('a grain decision writes one outcome per unit in the group', () => {
    const alex = afterAlex();
    const jane = partial(
      'Jane',
      ['service', 'software'].map((name, index) => answered(stratum(name), index as Seal)),
    );
    const review = reviewLanding(alex.base, alex.ledger, jane, []);
    const { outcomes } = landingOutcomes(review.units, [
      { questionId: 'SOV-1.dq', target: STORAGE, choice: { kind: 'grain', keep: 'strata' }, note: '' },
    ]);
    expect(outcomes).toHaveLength(3);
    expect(outcomes.find((o) => targetKey(o.target) === targetKey(STORAGE))?.answer).toBeNull();
    for (const name of ['service', 'software']) {
      const outcome = outcomes.find((o) => targetKey(o.target) === targetKey(stratum(name)));
      expect(outcome?.answer?.target).toEqual(stratum(name));
    }

    const answers = applyOutcomes(alex.base.answers, outcomes);
    expect(answers.find((a) => targetKey(a.target) === targetKey(STORAGE))).toBeUndefined();
    expect(answers.filter((a) => a.target.kind === 'dimension-stratum')).toHaveLength(2);
  });
});

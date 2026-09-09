import { describe, expect, it } from 'vitest';
import type { ClashResolution } from '../schema';
import { classify, isClash } from './clash-types';
import type { LandingUnit } from './clash-types';
import { reviewSummary } from './review';
import {
  SECURITY,
  STORAGE,
  answered,
  clashUnit,
  landedBase,
  partial,
  reviewOf,
  stratum,
} from './synthetic-fixture';

const take = (questionId: string, from: string): ClashResolution => ({
  questionId,
  target: STORAGE,
  choice: { kind: 'take', from },
  note: '',
});

const soleSource = (questionId: string): LandingUnit => ({
  kind: 'sole-source',
  questionId,
  target: STORAGE,
  candidate: { from: 'Jane', answer: answered(STORAGE, 2), claim: null, authority: 'out-of-claim' },
});

describe('reviewSummary', () => {
  it('counts what the header shows, and only decisions that land', () => {
    const review = reviewOf([
      soleSource('a'),
      soleSource('b'),
      clashUnit('c'),
      clashUnit('d'),
      clashUnit('e'),
    ]);
    expect(reviewSummary(review, [take('c', 'Jane')])).toEqual({
      answers: 5,
      newUnits: 2,
      clashes: 3,
      decided: 1,
      collisions: 0,
    });
    expect(reviewSummary(review, [take('c', 'Nobody')]).decided).toBe(0);
  });

  it('counts incoming answers, not units — a grain clash carries one per stratum', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const [grain] = classify(
      base,
      ledger,
      partial('Jane', [answered(stratum('service'), 2), answered(stratum('software'), 0), answered(stratum('hardware'), 1)]),
    );
    if (!isClash(grain)) throw new Error('expected a grain clash');
    const units: LandingUnit[] = [
      {
        kind: 'agreed',
        questionId: 'SOV-1.dq',
        target: SECURITY,
        candidates: [
          { from: 'Alex', answer: answered(SECURITY, 2), claim: null, authority: 'out-of-claim' },
          { from: 'Jane', answer: answered(SECURITY, 2), claim: null, authority: 'out-of-claim' },
        ],
        kept: 'Alex',
        answer: answered(SECURITY, 2),
      },
      soleSource('SOV-1.pq'),
      grain,
    ];
    expect(reviewSummary(reviewOf(units), [])).toEqual({
      answers: 5,
      newUnits: 1,
      clashes: 1,
      decided: 0,
      collisions: 0,
    });
    const decided: ClashResolution = {
      questionId: grain.questionId,
      target: grain.target,
      choice: { kind: 'grain', keep: 'strata' },
      note: '',
    };
    expect(reviewSummary(reviewOf(units), [decided]).decided).toBe(1);
  });
});

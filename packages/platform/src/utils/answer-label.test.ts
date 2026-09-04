import { describe, expect, it } from 'vitest';
import type { Answer, Question } from '../schema';
import { answerLabel, rungLabel } from './answer-label';

const T = { kind: 'assessment' } as const;
const G = { groupId: 'g1', placement: 'individual' as const };

const Q = {
  ladder: [
    { id: 'choice-1', description: 'r1', points: 25, seal: 1 },
    { id: 'choice-2', description: 'r2', points: 50, seal: 2 },
  ],
} as Pick<Question, 'ladder'>;

const Q_FLAT = {
  ladder: [
    { id: 'choice-1', description: 'Ad-hoc audits', points: 0, seal: 4 },
    { id: 'choice-2', description: 'Regular audits', points: 100, seal: 4 },
  ],
} as Pick<Question, 'ladder'>;

describe('answerLabel', () => {
  it('names the rung, and keeps the SEAL as the gate fact', () => {
    const answer: Answer = { questionId: 'q1', target: T, state: 'answered', rungId: 'choice-2', gesture: G };
    expect(answerLabel(Q, answer)).toBe('“r2” (SEAL 2)');
  });

  it('tells two rungs at the same SEAL apart', () => {
    const first: Answer = { questionId: 'q1', target: T, state: 'answered', rungId: 'choice-1', gesture: G };
    const second: Answer = { questionId: 'q1', target: T, state: 'answered', rungId: 'choice-2', gesture: G };
    expect(answerLabel(Q_FLAT, first)).toBe('“Ad-hoc audits” (SEAL 4)');
    expect(answerLabel(Q_FLAT, second)).toBe('“Regular audits” (SEAL 4)');
  });

  it('spells a don’t-know', () => {
    const answer: Answer = { questionId: 'q1', target: T, state: 'dont-know', gesture: G };
    expect(answerLabel(Q, answer)).toBe('don’t know');
  });

  it('spells an n/a', () => {
    const answer: Answer = { questionId: 'q1', target: T, state: 'na', gesture: G };
    expect(answerLabel(Q, answer)).toBe('n/a');
  });

  it('says so when the rung id resolves to nothing', () => {
    const answer: Answer = { questionId: 'q1', target: T, state: 'answered', rungId: 'choice-9', gesture: G };
    expect(answerLabel(Q, answer)).toBe('unknown rung');
  });
});

describe('rungLabel', () => {
  it('spells a rung by its own text', () => {
    expect(rungLabel(Q, 'choice-1')).toBe('“r1” (SEAL 1)');
  });

  it('says so when the rung id resolves to nothing', () => {
    expect(rungLabel(Q, 'choice-9')).toBe('unknown rung');
  });
});

import { describe, expect, it } from 'vitest';
import { sameStanding, snapshotOf } from './snapshot';
import type { Answer } from '../schema';

const G = { groupId: 'g1', placement: 'individual' as const };
const TARGET = { kind: 'assessment' as const };

const answered = (rungId: string, evidence?: string): Answer =>
  evidence === undefined
    ? { questionId: 'SOV-1.q1', target: TARGET, state: 'answered', rungId, gesture: G }
    : { questionId: 'SOV-1.q1', target: TARGET, state: 'answered', rungId, evidence, gesture: G };

describe('snapshotOf', () => {
  it('keeps evidence when it is there', () => {
    const result = snapshotOf(answered('choice-2', 'Audit 2026'));
    expect(result).toEqual({ state: 'answered', rungId: 'choice-2', evidence: 'Audit 2026', gesture: G });
    expect('questionId' in result).toBe(false);
  });

  it('omits an absent evidence key entirely', () => {
    const result = snapshotOf(answered('choice-2'));
    expect(result).toEqual({ state: 'answered', rungId: 'choice-2', gesture: G });
    expect('evidence' in result).toBe(false);
  });

  it('keeps an n/a reason, and omits an absent one', () => {
    const withReason = snapshotOf({
      questionId: 'SOV-1.q1',
      target: TARGET,
      state: 'na',
      reason: 'no such system',
      gesture: G,
    });
    expect(withReason).toEqual({ state: 'na', reason: 'no such system', gesture: G });
    const without = snapshotOf({ questionId: 'SOV-1.q1', target: TARGET, state: 'na', gesture: G });
    expect('reason' in without).toBe(false);
  });

  it('carries a dont-know across', () => {
    expect(
      snapshotOf({ questionId: 'SOV-1.q1', target: TARGET, state: 'dont-know', gesture: G }),
    ).toEqual({ state: 'dont-know', gesture: G });
  });
});

describe('sameStanding', () => {
  it('reads two absences as the same standing', () => {
    expect(sameStanding(null, null)).toBe(true);
    expect(sameStanding(null, snapshotOf(answered('choice-2')))).toBe(false);
    expect(sameStanding(snapshotOf(answered('choice-2')), null)).toBe(false);
  });

  it('reads state and rung only', () => {
    expect(
      sameStanding(snapshotOf(answered('choice-2', 'Audit 2026')), {
        state: 'answered',
        rungId: 'choice-2',
        gesture: { groupId: 'g2', placement: 'group' },
      }),
    ).toBe(true);
    expect(sameStanding(snapshotOf(answered('choice-2')), snapshotOf(answered('choice-3')))).toBe(false);
    expect(
      sameStanding(snapshotOf(answered('choice-2')), { state: 'dont-know', gesture: G }),
    ).toBe(false);
    expect(
      sameStanding({ state: 'na', reason: 'a', gesture: G }, { state: 'na', reason: 'b', gesture: G }),
    ).toBe(true);
  });
});

describe('two rungs sharing a SEAL are different answers (invariant #3)', () => {
  it('compares the rung, never the SEAL it carries', () => {
    expect(sameStanding(snapshotOf(answered('choice-2')), snapshotOf(answered('choice-2')))).toBe(true);
    expect(sameStanding(snapshotOf(answered('choice-2')), snapshotOf(answered('choice-4')))).toBe(false);
  });
});

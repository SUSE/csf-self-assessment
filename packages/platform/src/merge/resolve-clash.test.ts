import { describe, expect, it } from 'vitest';
import type { ClashResolution } from '../schema';
import { classify, clashCandidates, isClash } from './clash-types';
import type { LandingClash } from './clash-types';
import { resolveClash } from './resolve';
import { STORAGE, answered, landedBase, partial, stratum } from './synthetic-fixture';

const clashOf = (incoming: ReturnType<typeof answered>[]): LandingClash => {
  const { base, ledger } = landedBase([answered(STORAGE, 2)]);
  const [unit] = classify(base, ledger, partial('Jane', incoming));
  if (!isClash(unit)) throw new Error('expected a clash');
  return unit;
};

const divergence = () => clashOf([answered(STORAGE, 1)]);
const depthClash = () =>
  clashOf([answered(stratum('service'), 2), answered(stratum('software'), 0), answered(stratum('hardware'), 1)]);

const resolution = (clash: LandingClash, choice: ClashResolution['choice']): ClashResolution => ({
  questionId: clash.questionId,
  target: clash.target,
  choice,
  note: '',
});

describe('resolveClash', () => {
  it('take names one unit', () => {
    const clash = divergence();
    const outcomes = resolveClash(clash, resolution(clash, { kind: 'take', from: 'Jane' }));
    expect(outcomes).toHaveLength(1);
    expect(outcomes?.[0].target).toEqual(clash.target);
    expect(outcomes?.[0].candidates).toEqual(clashCandidates(clash));
    expect(outcomes?.[0].answer).toEqual(clashCandidates(clash)[1].answer);
  });

  it('take of a name neither side used is undecided', () => {
    const clash = divergence();
    expect(resolveClash(clash, resolution(clash, { kind: 'take', from: 'Nobody' }))).toBeNull();
  });

  it('re-answer mints the facilitator’s answer', () => {
    const clash = divergence();
    const outcomes = resolveClash(clash, resolution(clash, { kind: 'reanswer', rungId: 'choice-4' }));
    expect(outcomes).toHaveLength(1);
    const answer = outcomes?.[0].answer;
    if (answer === undefined || answer === null) throw new Error('expected an answer');
    expect(answer.state).toBe('answered');
    expect(answer.state === 'answered' ? answer.rungId : null).toBe('choice-4');
    expect(answer.gesture.placement).toBe('individual');
  });

  it('keeping the strata empties the roll-up', () => {
    const clash = depthClash();
    if (clash.kind !== 'depth-clash') throw new Error('expected a depth clash');
    const outcomes = resolveClash(clash, resolution(clash, { kind: 'depth', keep: 'strata' }));
    expect(outcomes).toHaveLength(4);
    expect(outcomes?.find((o) => o.target.kind === 'dimension')?.answer).toBeNull();
    for (const stratumUnit of clash.strata) {
      const outcome = outcomes?.find(
        (o) => o.target.kind === 'dimension-stratum' && o.target.stratum === stratumUnit.stratum,
      );
      expect(outcome?.answer).toEqual(stratumUnit.candidate.answer);
    }
  });

  it('keeping the roll-up empties every stratum', () => {
    const clash = depthClash();
    if (clash.kind !== 'depth-clash') throw new Error('expected a depth clash');
    const outcomes = resolveClash(clash, resolution(clash, { kind: 'depth', keep: 'roll-up' }));
    expect(outcomes).toHaveLength(4);
    expect(outcomes?.find((o) => o.target.kind === 'dimension')?.answer).toEqual(clash.rollUp.answer);
    expect(outcomes?.filter((o) => o.target.kind === 'dimension-stratum').every((o) => o.answer === null)).toBe(true);
  });

  it('a choice that does not fit the class is undecided', () => {
    const depth = depthClash();
    expect(resolveClash(depth, resolution(depth, { kind: 'take', from: 'Jane' }))).toBeNull();
    const unit = divergence();
    expect(resolveClash(unit, resolution(unit, { kind: 'depth', keep: 'strata' }))).toBeNull();
  });
});

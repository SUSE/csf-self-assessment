import { describe, expect, it } from 'vitest';
import { classify, clashCandidates, isClash } from './clash-types';
import { EMPTY_BASE, STORAGE, answered, landedBase, partial, stratum } from './synthetic-fixture';

const THREE_STRATA = [answered(stratum('service'), 2), answered(stratum('software'), 0), answered(stratum('hardware'), 1)];

describe('the grain clash', () => {
  it('a base roll-up under incoming strata is one grain clash', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const units = classify(base, ledger, partial('Jane', THREE_STRATA));
    expect(units).toHaveLength(1);
    const [unit] = units;
    if (unit.kind !== 'grain-clash') throw new Error('expected a grain clash');
    expect(unit.clash).toBe('grain');
    expect(unit.rollUpSide).toBe('base');
    expect(unit.target).toEqual(STORAGE);
    expect(unit.strata.map((s) => s.stratum)).toEqual(['service', 'software', 'hardware']);
  });

  it('an incoming roll-up over base strata is the same clash, mirrored', () => {
    const { base, ledger } = landedBase(THREE_STRATA);
    const units = classify(base, ledger, partial('Jane', [answered(STORAGE, 2)]));
    expect(units).toHaveLength(1);
    const [unit] = units;
    if (unit.kind !== 'grain-clash') throw new Error('expected a grain clash');
    expect(unit.rollUpSide).toBe('incoming');
    expect(unit.rollUp.from).toBe('Jane');
    expect(unit.strata.map((s) => s.candidate.from)).toEqual(['Alex', 'Alex', 'Alex']);
  });

  it('strata on both sides are ordinary unit clashes', () => {
    const { base, ledger } = landedBase(THREE_STRATA);
    const units = classify(
      base,
      ledger,
      partial('Jane', [answered(stratum('service'), 2), answered(stratum('software'), 0), answered(stratum('hardware'), 3)]),
    );
    expect(units.some((u) => u.kind === 'grain-clash')).toBe(false);
    expect(units.filter((u) => u.kind === 'unit-clash')).toHaveLength(1);
  });

  it('a roll-up and strata on the same side is not a grain clash', () => {
    const units = classify(
      EMPTY_BASE,
      [],
      partial('Jane', [answered(STORAGE, 2), answered(stratum('service'), 1), answered(stratum('software'), 0)]),
    );
    expect(units.some((u) => u.kind === 'grain-clash')).toBe(false);
    expect(units.filter((u) => u.kind === 'sole-source')).toHaveLength(3);
  });

  it('clashCandidates lists the roll-up then every stratum', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const [unit] = classify(base, ledger, partial('Jane', THREE_STRATA));
    if (!isClash(unit)) throw new Error('expected a clash');
    const candidates = clashCandidates(unit);
    expect(candidates).toHaveLength(4);
    expect(candidates[0].from).toBe('Alex');
  });
});

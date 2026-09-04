import { describe, expect, it } from 'vitest';
import type { Answer, Claim, Landing } from '../schema';
import { classify, isClash } from './clash-types';
import type { LandingUnit } from './clash-types';
import {
  EMPTY_BASE,
  G,
  SECURITY,
  STORAGE,
  answered,
  dontKnow,
  landedBase,
  na,
  partial,
} from './synthetic-fixture';

describe('classify', () => {
  it('an empty base makes every incoming answer sole-source', () => {
    const units = classify(EMPTY_BASE, [], partial('Jane', [answered(STORAGE, 2), answered(SECURITY, 3)]));
    expect(units).toHaveLength(2);
    expect(units.every((u) => u.kind === 'sole-source')).toBe(true);
    expect(units.map((u) => (u.kind === 'sole-source' ? u.candidate.from : null))).toEqual(['Jane', 'Jane']);
  });

  it('the candidate carries the claim that produced it', () => {
    const claim: Claim = { roles: ['SEC'], dimensions: ['security'], parties: [] };
    const [storage, security] = classify(
      EMPTY_BASE,
      [],
      partial('Jane', [answered(STORAGE, 2), answered(SECURITY, 3)], [claim]),
    );
    expect(storage.kind === 'sole-source' ? storage.candidate.claim : 'wrong-kind').toBeNull();
    expect(security.kind === 'sole-source' ? security.candidate.claim : null).toEqual(claim);
  });

  it('the candidate carries the rung its claim confers', () => {
    const owner: Claim = { roles: ['SEC'], dimensions: ['security'], parties: [] };
    const [, security] = classify(
      EMPTY_BASE,
      [],
      partial('Jane', [answered(STORAGE, 2), answered(SECURITY, 3)], [owner]),
    );
    if (security.kind !== 'sole-source') throw new Error('expected sole-source');
    expect(security.candidate).toEqual({
      from: 'Jane',
      answer: { ...answered(SECURITY, 3), gesture: { ...G, groupId: 'Jane:g1' } },
      claim: owner,
      authority: 'owner',
    });

    const [outOfClaim] = classify(EMPTY_BASE, [], partial('Jane', [answered(STORAGE, 2)], [owner]));
    expect(outOfClaim.kind === 'sole-source' ? outOfClaim.candidate.claim : 'wrong-kind').toBeNull();
    expect(outOfClaim.kind === 'sole-source' ? outOfClaim.candidate.authority : null).toBe('out-of-claim');

    const blanket: Claim = { roles: ['SEC'], dimensions: [], parties: [] };
    const [blanketUnit] = classify(EMPTY_BASE, [], partial('Jane', [answered(STORAGE, 2)], [blanket]));
    expect(blanketUnit.kind === 'sole-source' ? blanketUnit.candidate.authority : null).toBe('blanket');
  });

  it('the base side’s rung is read from its ledger record, not recomputed', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const blanketLedger: Landing[] = ledger.map((landing) => ({
      ...landing,
      records: landing.records.map((record) =>
        record.kind === 'answer'
          ? { ...record, candidates: record.candidates.map((c) => ({ ...c, authority: 'blanket' as const })) }
          : record,
      ),
    }));
    const [unit] = classify(base, blanketLedger, partial('Jane', [answered(STORAGE, 3)]));
    if (unit.kind !== 'unit-clash') throw new Error('expected a clash');
    expect(unit.base.authority).toBe('blanket');
  });

  it('a landing namespaces the incoming gestures', () => {
    const [unit] = classify(EMPTY_BASE, [], partial('Jane', [answered(STORAGE, 2)]));
    expect(unit.kind === 'sole-source' ? unit.candidate.answer.gesture.groupId : null).toBe('Jane:g1');
    expect(EMPTY_BASE.answers).toEqual([]);
  });

  it('same state and seal is agreement, and the base representative is kept', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const units = classify(base, ledger, partial('Jane', [answered(STORAGE, 2)]));
    expect(units).toHaveLength(1);
    const [unit] = units;
    if (unit.kind !== 'agreed') throw new Error('expected agreement');
    expect(unit.kept).toBe('Alex');
    expect(unit.candidates.map((c) => c.from)).toEqual(['Alex', 'Jane']);
    expect(unit.answer).toEqual(base.answers[0]);
  });

  it('evidence wins the representative', () => {
    const alex = landedBase([answered(STORAGE, 2)]);
    const [unit] = classify(alex.base, alex.ledger, partial('Jane', [answered(STORAGE, 2, 'runbook')]));
    if (unit.kind !== 'agreed') throw new Error('expected agreement');
    expect(unit.kept).toBe('Jane');
    expect(unit.answer.state === 'answered' ? unit.answer.evidence : null).toBe('runbook');

    const both = landedBase([answered(STORAGE, 2, 'policy')]);
    const [bothUnit] = classify(both.base, both.ledger, partial('Jane', [answered(STORAGE, 2, 'runbook')]));
    expect(bothUnit.kind === 'agreed' ? bothUnit.kept : null).toBe('Alex');
  });

  it('different seals clash', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    const [unit] = classify(base, ledger, partial('Jane', [answered(STORAGE, 3)]));
    if (unit.kind !== 'unit-clash') throw new Error('expected a clash');
    expect(unit.base.from).toBe('Alex');
    expect(unit.incoming.from).toBe('Jane');
  });

  it('answered against don’t-know clashes', () => {
    const { base, ledger } = landedBase([answered(STORAGE, 2)]);
    expect(classify(base, ledger, partial('Jane', [dontKnow(STORAGE)]))[0].kind).toBe('unit-clash');
  });
});

describe('the clash classes', () => {
  const classOf = (baseAnswer: Answer, incomingAnswer: Answer): string | null => {
    const { base, ledger } = landedBase([baseAnswer]);
    const [unit] = classify(base, ledger, partial('Jane', [incomingAnswer]));
    return unit.kind === 'unit-clash' ? unit.clash : null;
  };

  it('both answered at different rungs is a divergence', () => {
    expect(classOf(answered(STORAGE, 2), answered(STORAGE, 1))).toBe('divergence');
  });

  it('answered against don’t-know is a gap', () => {
    expect(classOf(answered(STORAGE, 2), dontKnow(STORAGE))).toBe('gap');
    expect(classOf(dontKnow(STORAGE), answered(STORAGE, 2))).toBe('gap');
  });

  it('answered against n/a is a scope clash', () => {
    expect(classOf(answered(STORAGE, 2), na(STORAGE))).toBe('scope');
    expect(classOf(na(STORAGE), answered(STORAGE, 2))).toBe('scope');
  });

  it('n/a outranks don’t-know', () => {
    expect(classOf(dontKnow(STORAGE), na(STORAGE))).toBe('scope');
  });

  it('isClash finds every clash and no agreement', () => {
    const alex = landedBase([answered(STORAGE, 2)]);
    const units: LandingUnit[] = [
      ...classify(EMPTY_BASE, [], partial('Jane', [answered(SECURITY, 2)])),
      ...classify(alex.base, alex.ledger, partial('Jane', [answered(STORAGE, 2)])),
      ...classify(alex.base, alex.ledger, partial('Jane', [answered(STORAGE, 1)])),
    ];
    expect(units.filter(isClash)).toHaveLength(1);
  });
});

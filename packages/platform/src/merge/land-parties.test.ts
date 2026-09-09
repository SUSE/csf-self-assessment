import { describe, expect, it } from 'vitest';
import type { Party } from '../schema';
import { land } from './land';
import { ACME_EU, L2, NORTHSTAR, NO_DECISIONS, afterAlex, onParty, partial, stamp } from './synthetic-fixture';

const ACME_EUROPE: Party = { id: 'acme-cloud', name: 'Acme Cloud Europe', type: 'subprocessor', serves: ['edge'] };

describe('landing the party axis', () => {
  it('a party-only landing still lands', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, partial('Jane', [], [], [NORTHSTAR]), NO_DECISIONS, stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    expect(outcome.ledger).toHaveLength(2);
    const records = outcome.ledger[1].records;
    expect(records).toHaveLength(1);
    expect(records[0].kind === 'party' ? records[0].decision.kind : null).toBe('add');
  });

  it('every party mutation gets a record, additions included, and they lead the Landing', () => {
    const alex = afterAlex();
    const jane = partial('Jane', [onParty('acme-eu', 2)], [], [ACME_EU, NORTHSTAR]);
    const outcome = land(
      alex.base,
      alex.ledger,
      jane,
      {
        resolutions: [],
        partyDecisions: [
          { added: 'acme-eu', choice: { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud EU' }, note: 'n' },
        ],
      },
      stamp(L2, 'T2'),
    );
    if (!outcome.ok) throw new Error('expected a clean landing');
    const records = outcome.ledger[1].records;
    expect(records.filter((r) => r.kind === 'party').map((r) => (r.kind === 'party' ? r.decision.kind : null))).toEqual([
      'absorb',
      'add',
    ]);
    expect(records.slice(0, 2).every((r) => r.kind === 'party')).toBe(true);
    expect(records.slice(2).every((r) => r.kind === 'answer')).toBe(true);
  });

  it('a split appends its own record', () => {
    const alex = afterAlex();
    const jane = partial('Jane', [onParty('acme-cloud', 2)], [], [ACME_EUROPE]);
    const outcome = land(
      alex.base,
      alex.ledger,
      jane,
      {
        resolutions: [],
        partyDecisions: [
          { added: 'acme-cloud', choice: { kind: 'split', id: 'acme-cloud-jane', from: 'acme-cloud' }, note: '' },
        ],
      },
      stamp(L2, 'T2'),
    );
    if (!outcome.ok) throw new Error('expected a clean landing');
    const first = outcome.ledger[1].records[0];
    if (first.kind !== 'party') throw new Error('expected a party record');
    expect(first.decision.kind).toBe('split');
  });

  it('an undecided collision appends no party record', () => {
    const alex = afterAlex();
    const jane = partial('Jane', [onParty('acme-cloud', 2)], [], [ACME_EUROPE]);
    const outcome = land(alex.base, alex.ledger, jane, NO_DECISIONS, stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    expect(outcome.ledger[1].records.every((r) => r.kind === 'answer')).toBe(true);
  });
});

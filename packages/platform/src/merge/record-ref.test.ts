import { describe, expect, it } from 'vitest';
import type { AnswerLedgerRecord, AnswerSnapshot, PartyLedgerRecord, Seal } from '../schema';
import type { RecordRef } from './record-ref';
import { RecordRefSchema, partySubject, recordRef, recordRefKey, sameRecordRef } from './record-ref';

const G = { groupId: 'g1', placement: 'individual' as const };
const snap = (seal: Seal): AnswerSnapshot => ({ state: 'answered', rungId: `choice-${seal + 1}`, gesture: G });

const ESTATE_ANSWER: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-2.q1',
  target: { kind: 'assessment' },
  before: null,
  after: snap(2),
  candidates: [{ from: 'Alex', answer: snap(2), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

const STRATUM_ANSWER: AnswerLedgerRecord = {
  ...ESTATE_ANSWER,
  target: { kind: 'dimension-stratum', dimension: 'storage', stratum: 'hot' },
};

const ESTATE_PARTY = { id: 'acme-cloud', name: 'Acme Cloud EU', type: 'provider', serves: [] };
const INCOMING_PARTY = {
  id: 'jane:acme-eu',
  name: 'Acme Cloud Europe SAS',
  type: 'provider',
  serves: ['security'],
};

const partyRecord = (decision: PartyLedgerRecord['decision']): PartyLedgerRecord => ({
  kind: 'party',
  before: [ESTATE_PARTY, INCOMING_PARTY],
  after: [ESTATE_PARTY],
  decision,
  affectedTargets: [],
});

const ADD = partyRecord({ kind: 'add', party: 'acme-new' });
const ABSORB = partyRecord({
  kind: 'absorb',
  from: 'jane:acme-eu',
  into: 'acme-cloud',
  name: 'Acme Cloud Europe SAS',
  by: 'facilitator',
  note: '',
});
const RENAME = partyRecord({
  kind: 'rename',
  party: 'acme-cloud',
  name: 'Acme Cloud Europe',
  by: 'facilitator',
  note: '',
});
const SPLIT = partyRecord({
  kind: 'split',
  from: 'acme-cloud',
  id: 'jane:acme-eu-2',
  by: 'facilitator',
  note: '',
});

describe('the name a reading anchors on', () => {
  it('a party record is named by the party its decision is about', () => {
    expect(partySubject(ADD)).toBe('acme-new');
    expect(partySubject(ABSORB)).toBe('jane:acme-eu');
    expect(partySubject(RENAME)).toBe('acme-cloud');
    expect(partySubject(SPLIT)).toBe('jane:acme-eu-2');
  });

  it('a ref carries the record’s identity and nothing else', () => {
    expect(recordRef(ESTATE_ANSWER)).toEqual({
      kind: 'answer',
      questionId: 'SOV-2.q1',
      target: { kind: 'assessment' },
    });
    expect(recordRef(ADD)).toEqual({ kind: 'party', party: 'acme-new' });
  });

  it('two refs are the same only when the whole identity matches', () => {
    const a: RecordRef = { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'assessment' } };
    const b: RecordRef = { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'assessment' } };
    expect(sameRecordRef(a, b)).toBe(true);
    expect(
      sameRecordRef(a, { kind: 'answer', questionId: 'SOV-2.q2', target: { kind: 'assessment' } }),
    ).toBe(false);
    expect(
      sameRecordRef(
        { kind: 'answer', questionId: 'SOV-2.q1', target: { kind: 'dimension', dimension: 'storage' } },
        {
          kind: 'answer',
          questionId: 'SOV-2.q1',
          target: { kind: 'dimension-stratum', dimension: 'storage', stratum: 'hot' },
        },
      ),
    ).toBe(false);
    expect(sameRecordRef(a, { kind: 'party', party: 'acme-new' })).toBe(false);
    expect(sameRecordRef({ kind: 'party', party: 'a' }, { kind: 'party', party: 'b' })).toBe(false);
  });

  it('a key is stable and CSS-attribute safe', () => {
    const keys = [
      recordRefKey(recordRef(ESTATE_ANSWER)),
      recordRefKey(recordRef(STRATUM_ANSWER)),
      recordRefKey(recordRef(ADD)),
    ];
    expect(keys).toEqual([
      'answer:SOV-2.q1 assessment',
      'answer:SOV-2.q1 dimension-stratum:storage:hot',
      'party:acme-new',
    ]);
    for (const key of keys) expect(key).not.toContain('"');
  });

  it('the schema accepts a ref and rejects a near miss', () => {
    expect(
      RecordRefSchema.safeParse({
        kind: 'answer',
        questionId: 'q',
        target: { kind: 'assessment' },
      }).success,
    ).toBe(true);
    expect(RecordRefSchema.safeParse({ kind: 'party', party: '' }).success).toBe(false);
    expect(RecordRefSchema.safeParse({ kind: 'answer', questionId: 'q' }).success).toBe(false);
    expect(RecordRefSchema.safeParse({ kind: 'record' }).success).toBe(false);
  });
});

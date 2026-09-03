import { describe, expect, it } from 'vitest';
import type { EstateBase, PartyDecision, Seal } from '../schema';
import { targetKey } from '../assessment';
import { land } from './land';
import { L2, NO_DECISIONS, SECURITY, STORAGE, afterAlex, answered, partial, stamp, stratum } from './synthetic-fixture';

const takeSecurity = {
  resolutions: [{ questionId: 'SOV-1.dq', target: SECURITY, choice: { kind: 'take' as const, from: 'Jane' }, note: '' }],
  partyDecisions: [] as PartyDecision[],
};

const grainDecisions = (keep: 'strata' | 'roll-up') => ({
  resolutions: [{ questionId: 'SOV-1.dq', target: STORAGE, choice: { kind: 'grain' as const, keep }, note: '' }],
  partyDecisions: [] as PartyDecision[],
});

/** Jane refines storage into every declared stratum. */
const JANE_STRATA = partial(
  'Jane',
  ['service', 'software', 'hardware', 'chips'].map((name, index) => answered(stratum(name), (index % 3) as Seal)),
);

const stratumAnswersOf = (base: EstateBase) =>
  base.answers.filter((a) => a.target.kind === 'dimension-stratum' && a.target.dimension === 'storage');
const rollUpAnswerOf = (base: EstateBase) =>
  base.answers.find((a) => a.questionId === 'SOV-1.dq' && targetKey(a.target) === targetKey(STORAGE));

describe('landing a decided clash', () => {
  it('a taken resolution records the choice and the winner', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, partial('Jane', [answered(SECURITY, 4)]), takeSecurity, stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    const records = outcome.ledger[1].records;
    const record = records[records.length - 1];
    if (record.kind !== 'answer') throw new Error('expected an answer record');
    expect(record.candidates.map((c) => c.from)).toEqual(['Alex', 'Jane']);
    expect(record.decision).toEqual({
      kind: 'resolved',
      clash: 'divergence',
      choice: { kind: 'take', from: 'Jane' },
      by: 'facilitator',
      note: '',
    });
    expect(record.after?.state === 'answered' ? record.after.rungId : null).toBe('choice-5');
    const standing = outcome.base.answers.find(
      (a) => a.questionId === 'SOV-1.dq' && targetKey(a.target) === targetKey(SECURITY),
    );
    expect(standing?.state === 'answered' ? standing.rungId : null).toBe('choice-5');
  });

  it('a re-answer mints a facilitator answer', () => {
    const alex = afterAlex();
    const outcome = land(
      alex.base,
      alex.ledger,
      partial('Jane', [answered(SECURITY, 4)]),
      {
        resolutions: [{ questionId: 'SOV-1.dq', target: SECURITY, choice: { kind: 'reanswer', rungId: 'choice-5' }, note: '' }],
        partyDecisions: [],
      },
      stamp(L2, 'T2'),
    );
    if (!outcome.ok) throw new Error('expected a clean landing');
    const records = outcome.ledger[1].records;
    const record = records[records.length - 1];
    if (record.kind !== 'answer') throw new Error('expected an answer record');
    expect(record.after?.state).toBe('answered');
    expect(record.after?.gesture.groupId).toBe(`facilitator:SOV-1.dq:${targetKey(SECURITY)}`);
  });
});

describe('landing a grain decision', () => {
  it('a decision that empties the roll-up records the loss', () => {
    const alex = afterAlex();
    const twoStrata = partial(
      'Jane',
      ['service', 'software'].map((name, index) => answered(stratum(name), index as Seal)),
    );
    const outcome = land(alex.base, alex.ledger, twoStrata, grainDecisions('strata'), stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    const rollUp = outcome.ledger[1].records.find(
      (r) => r.kind === 'answer' && targetKey(r.target) === targetKey(STORAGE),
    );
    if (rollUp === undefined || rollUp.kind !== 'answer') throw new Error('expected a roll-up record');
    expect(rollUp.after).toBeNull();
    expect(rollUp.before).not.toBeNull();
  });

  it('keeping the strata writes five records and drops the roll-up', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, JANE_STRATA, grainDecisions('strata'), stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    const fresh = outcome.ledger[1].records;
    expect(fresh).toHaveLength(5);
    const rollUpRecord = fresh.find((r) => r.kind === 'answer' && targetKey(r.target) === targetKey(STORAGE));
    if (rollUpRecord === undefined || rollUpRecord.kind !== 'answer') throw new Error('expected a roll-up record');
    expect(rollUpRecord.after).toBeNull();
    expect(rollUpRecord.decision.kind === 'resolved' ? rollUpRecord.decision.clash : null).toBe('grain');
    expect(stratumAnswersOf(outcome.base)).toHaveLength(4);
    expect(rollUpAnswerOf(outcome.base)).toBeUndefined();
  });

  it('keeping the roll-up deletes the stratum answers', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, JANE_STRATA, grainDecisions('roll-up'), stamp(L2, 'T2'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    const fresh = outcome.ledger[1].records;
    expect(fresh).toHaveLength(5);
    const stratumRecords = fresh.filter((r) => r.kind === 'answer' && r.target.kind === 'dimension-stratum');
    expect(stratumRecords).toHaveLength(4);
    expect(stratumRecords.every((r) => r.kind === 'answer' && r.after === null)).toBe(true);
    expect(stratumAnswersOf(outcome.base)).toHaveLength(0);
  });

  it('an undecided grain clash blocks the landing', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, JANE_STRATA, NO_DECISIONS, stamp(L2, 'T2'));
    if (outcome.ok) throw new Error('expected a refusal');
    if (outcome.refusal.kind !== 'undecided') throw new Error('expected undecided');
    expect(outcome.refusal.undecided).toHaveLength(1);
    expect(outcome.refusal.undecided[0].kind).toBe('grain-clash');
  });
});

import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from '../schema';
import { assessmentOf, targetKey } from '../assessment';
import { checkPartial } from './index';
import { finalizeLanded, land, landingRefusalMessage } from './land';
import { unitHistory } from './ledger';
import {
  ALEX,
  EMPTY_BASE,
  G,
  INST,
  L1,
  L2,
  L3,
  NO_DECISIONS,
  SECURITY,
  STORAGE,
  WA,
  WB,
  afterAlex,
  answered,
  onParty,
  partial,
  stamp,
} from './synthetic-fixture';

describe('land writes one Landing', () => {
  it('one Land appends exactly one Landing', () => {
    const jane = partial('Jane', [answered(STORAGE, 2), answered(SECURITY, 3), onParty('inst', 2)]);
    const outcome = land(EMPTY_BASE, [], jane, NO_DECISIONS, stamp(L1, 'T1'));
    if (!outcome.ok) throw new Error('expected a clean landing');
    expect(outcome.ledger).toHaveLength(1);
    const landing = outcome.ledger[0];
    expect(landing.id).toBe(L1);
    expect(landing.at).toBe('T1');
    expect(landing.participant).toBe('Jane');
    expect('note' in landing).toBe(false);
    expect(landing.records).toHaveLength(3);
    for (const record of landing.records) {
      expect(record.kind).toBe('answer');
      expect(record.kind === 'answer' ? record.decision.kind : null).toBe('sole-source');
    }
    expect(outcome.base.answers).toHaveLength(3);
  });

  it('the note is trimmed onto the envelope and an empty one is omitted', () => {
    const landOnce = (note: string) =>
      land(EMPTY_BASE, [], partial('Jane', [answered(STORAGE, 2)]), NO_DECISIONS, stamp(L1, 'T1', note));

    const noted = landOnce('  after the discussion  ');
    if (!noted.ok) throw new Error('expected a clean landing');
    expect(noted.ledger[0].note).toBe('after the discussion');

    const blank = landOnce('   ');
    if (!blank.ok) throw new Error('expected a clean landing');
    expect('note' in blank.ledger[0]).toBe(false);
  });

  it('a record stores what stood before and after', () => {
    const alex = afterAlex();
    const outcome = land(
      alex.base,
      alex.ledger,
      partial('Jane', [answered(SECURITY, 4), answered(STORAGE, 2), onParty('inst', 2)]),
      {
        resolutions: [{ questionId: 'SOV-1.dq', target: SECURITY, choice: { kind: 'take', from: 'Jane' }, note: '' }],
        partyDecisions: [],
      },
      stamp(L2, 'T2'),
    );
    if (!outcome.ok) throw new Error('expected a clean landing');
    const records = outcome.ledger[1].records;
    const security = records.find((r) => r.kind === 'answer' && targetKey(r.target) === targetKey(SECURITY));
    if (security === undefined || security.kind !== 'answer') throw new Error('expected a record');
    expect(security.before).toEqual({ state: 'answered', rungId: 'choice-4', gesture: { ...G, groupId: 'Alex:g1' } });
    expect(security.after).toEqual({ state: 'answered', rungId: 'choice-5', gesture: { ...G, groupId: 'Jane:g1' } });

    const fresh = records.find((r) => r.kind === 'answer' && r.target.kind === 'party' && r.target.party === 'inst');
    if (fresh === undefined || fresh.kind !== 'answer') throw new Error('expected a record');
    expect(fresh.before).toBeNull();
  });

  it('re-landing the same participant appends a second Landing', () => {
    const first = afterAlex();
    const second = land(first.base, first.ledger, ALEX, NO_DECISIONS, stamp(L2, 'T2'));
    if (!second.ok) throw new Error('expected a clean landing');
    expect(second.ledger).toHaveLength(2);
    const history = unitHistory(second.ledger, 'SOV-1.dq', STORAGE);
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(unitHistory(first.ledger, 'SOV-1.dq', STORAGE)[0]);
  });

  it('finalizeLanded stamps the base', () => {
    const alex = afterAlex();
    const result = finalizeLanded(WA, alex.base, alex.ledger);
    expect(result.meta.participant).toBeUndefined();
    expect(result.claims).toBeUndefined();
    expect(result.ledger).toEqual(alex.ledger);
    expect(result.parties).toEqual(alex.base.parties);
    expect(result.answers).toEqual(alex.base.answers);
    expect(AssessmentSchema.safeParse(result).success).toBe(true);
  });
});

describe('land refuses rather than write half a Landing', () => {
  it('a partially decided landing writes nothing', () => {
    const alex = afterAlex();
    const baseBefore = structuredClone(alex.base);
    const ledgerBefore = structuredClone(alex.ledger);
    const outcome = land(alex.base, alex.ledger, partial('Jane', [answered(STORAGE, 4)]), NO_DECISIONS, stamp(L2, 'T2'));
    if (outcome.ok) throw new Error('expected a refusal');
    if (outcome.refusal.kind !== 'undecided') throw new Error('expected undecided');
    expect(outcome.refusal.undecided).toHaveLength(1);
    expect(outcome.refusal.undecided[0].questionId).toBe('SOV-1.dq');
    expect(alex.base).toEqual(baseBefore);
    expect(alex.ledger).toEqual(ledgerBefore);
  });

  it('a duplicate Landing id is refused', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, ALEX, NO_DECISIONS, stamp(L1, 'T2'));
    if (outcome.ok) throw new Error('expected a refusal');
    expect(outcome.refusal).toEqual({ kind: 'duplicate-id', id: L1 });
  });

  it('a partial that changes nothing cannot land', () => {
    const alex = afterAlex();
    const outcome = land(alex.base, alex.ledger, partial('Jane', []), NO_DECISIONS, stamp(L2, 'T2'));
    if (outcome.ok) throw new Error('expected a refusal');
    expect(outcome.refusal).toEqual({ kind: 'nothing-to-land' });
    expect(alex.ledger).toHaveLength(1);
  });

  it('landingRefusalMessage speaks the refusal', () => {
    expect(landingRefusalMessage({ kind: 'undecided', undecided: [] })).toBe(
      'Nothing landed: every clash and provider id collision must be decided first.',
    );
    expect(landingRefusalMessage({ kind: 'duplicate-id', id: L3 })).toBe(
      `Nothing landed: Landing ${L3} is already in the ledger.`,
    );
    expect(landingRefusalMessage({ kind: 'nothing-to-land' })).toBe(
      'Nothing to land: this partial changes no answer unit and no provider.',
    );
  });
});

describe('checkPartial', () => {
  it('accepts a repeat name but refuses a stale workbook or a finalized', () => {
    expect(checkPartial(WA, ALEX)).toEqual({ ok: true });

    const stale = assessmentOf({ ...WB, meta: { ...WB.meta, version: '9.9.9' } }, 'E', [INST], [], {
      kind: 'partial',
      workbookAssessment: 'wa-1',
      participant: { name: 'Alex' },
      claims: [],
      partiesAdded: [],
    });
    const staleCheck = checkPartial(WA, stale);
    expect(staleCheck.ok).toBe(false);
    expect(staleCheck.ok ? '' : staleCheck.reason).toContain('9.9.9');
    expect(staleCheck.ok ? '' : staleCheck.reason).toContain('1.0.0');

    const finalized = assessmentOf(WB, 'E', [INST], [], {
      kind: 'finalized',
      workbookAssessment: 'wa-1',
      ledger: [],
    });
    expect(checkPartial(WA, finalized).ok).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  Claim,
  Landing,
  LedgerRecord,
  Party,
  Seal,
  Target,
} from '../schema';
import {
  disputedSentences,
  effectOf,
  landingSummary,
  ledgerEntries,
  ledgerSummary,
  ledgerUnits,
  questionBlame,
  recordSentence,
  shortLandingId,
  standingCandidate,
  unitHistory,
} from './ledger';

const L1 = '11111111-1111-4111-8111-111111111111';
const L2 = '22222222-2222-4222-8222-222222222222';

const LADDER = [0, 1, 2, 3, 4].map((seal, i) => ({
  id: `choice-${i + 1}`,
  description: `r${seal}`,
  points: seal * 25,
  seal: seal as Seal,
}));

const WB = {
  dimensions: [
    { id: 'storage', name: 'Storage', critical: false },
    { id: 'security', name: 'Security', critical: false },
  ],
  objectives: [
    {
      id: 'O',
      name: 'O',
      weight: 100,
      questions: ['q1', 'q2'].map((id) => ({
        id,
        grain: 'dimension' as const,
        appliesTo: ['storage'],
        text: id,
        why: 'w',
        role: 'ARCH',
        defaultMateriality: 'material' as const,
        ladder: LADDER,
      })),
    },
  ],
};

const PARTIES: Party[] = [{ id: 'acme', name: 'Acme Cloud EU', type: 't1', serves: [] }];

const UNIT_A: Target = { kind: 'dimension', dimension: 'storage' };
const UNIT_B: Target = { kind: 'party', party: 'acme' };
const G = { groupId: 'g1', placement: 'individual' as const };

const CLAIM_ALEX: Claim = { roles: ['ARCH'], dimensions: ['storage'], parties: [] };
const CLAIM_JANE: Claim = { roles: ['SEC'], dimensions: ['security'], parties: [] };

const snap = (seal: Seal): AnswerSnapshot => ({ state: 'answered', rungId: `choice-${seal + 1}`, gesture: G });

const A_SOLE: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'q1',
  target: UNIT_A,
  before: null,
  after: snap(2),
  candidates: [{ from: 'Alex', answer: snap(2), claim: CLAIM_ALEX, authority: 'owner' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

const B_SOLE: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'q2',
  target: UNIT_B,
  before: null,
  after: snap(1),
  candidates: [{ from: 'Alex', answer: snap(1), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

const PARTY: LedgerRecord = {
  kind: 'party',
  before: [
    { id: 'acme', name: 'Acme Cloud EU', type: 't1', serves: [] },
    { id: 'acme-eu', name: 'Acme Cloud Europe SAS', type: 't1', serves: ['edge'] },
  ],
  after: [{ id: 'acme', name: 'Acme Cloud EU', type: 't1', serves: ['edge'] }],
  decision: {
    kind: 'absorb',
    from: 'acme-eu',
    into: 'acme',
    name: 'Acme Cloud EU',
    by: 'facilitator',
    note: '',
  },
  affectedTargets: [],
};

const A_AGREED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'q1',
  target: UNIT_A,
  before: snap(2),
  after: snap(2),
  candidates: [
    { from: 'Alex', answer: snap(2), claim: CLAIM_ALEX, authority: 'owner' },
    { from: 'Jane', answer: snap(2), claim: CLAIM_JANE, authority: 'blanket' },
  ],
  decision: { kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Jane' },
};

const B_TAKEN_JANE: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'q2',
  target: UNIT_B,
  before: snap(2),
  after: snap(1),
  candidates: [
    { from: 'Alex', answer: snap(2), claim: CLAIM_ALEX, authority: 'owner' },
    { from: 'Jane', answer: snap(1), claim: CLAIM_JANE, authority: 'blanket' },
  ],
  decision: {
    kind: 'resolved',
    clash: 'divergence',
    choice: { kind: 'take', from: 'Jane' },
    by: 'facilitator',
    note: '',
  },
};

const LANDING_1: Landing = { id: L1, at: 'T1', participant: 'Alex', records: [A_SOLE, B_SOLE] };
const LANDING_2: Landing = {
  id: L2,
  at: 'T2',
  participant: 'Jane',
  note: 'after the security discussion',
  records: [PARTY, A_AGREED, B_TAKEN_JANE],
};
const LEDGER: Landing[] = [LANDING_1, LANDING_2];

describe('effectOf', () => {
  const record = (before: AnswerSnapshot | null, after: AnswerSnapshot | null): AnswerLedgerRecord => ({
    ...A_SOLE,
    before,
    after,
  });

  it('partitions a record by what changed', () => {
    expect(effectOf(record(null, snap(2)))).toBe('new');
    expect(effectOf(record(snap(2), null))).toBe('cleared');
    expect(effectOf(record(snap(2), snap(3)))).toBe('changed');
    expect(
      effectOf(record(snap(2), { state: 'answered', rungId: 'choice-3', evidence: 'later', gesture: G })),
    ).toBe('unchanged');
    expect(effectOf(record(null, null))).toBe('unchanged');
  });
});

describe('landingSummary', () => {
  const ADD: LedgerRecord = {
    kind: 'party',
    before: [],
    after: [{ id: 'northstar-edge', name: 'Northstar Edge', type: 't1', serves: [] }],
    decision: { kind: 'add', party: 'northstar-edge' },
    affectedTargets: [],
  };
  const RESOLVED_UP: AnswerLedgerRecord = { ...B_TAKEN_JANE, before: snap(2), after: snap(3) };

  it('reads one Landing’s effect partition and process counts', () => {
    const landing: Landing = {
      id: L2,
      at: 'T2',
      participant: 'Jane',
      records: [ADD, A_SOLE, A_AGREED, RESOLVED_UP],
    };
    const summary = landingSummary(landing);
    expect(summary).toEqual({
      unitsReviewed: 3,
      newUnits: 1,
      changed: 1,
      cleared: 0,
      unchanged: 1,
      agreements: 1,
      resolvedClashes: 1,
      partyDecisions: 1,
    });
    expect(summary.newUnits + summary.changed + summary.cleared + summary.unchanged).toBe(
      summary.unitsReviewed,
    );
  });
});

describe('shortLandingId', () => {
  it('is the first seven characters', () => {
    expect(shortLandingId(L1)).toBe('1111111');
  });
});

describe('standingCandidate', () => {
  it('reads sole-source', () => {
    expect(standingCandidate(A_SOLE)).toEqual({
      from: 'Alex',
      answer: A_SOLE.after,
      claim: CLAIM_ALEX,
      authority: 'owner',
    });
  });

  it('reads agreed by kept', () => {
    expect(standingCandidate(A_AGREED)).toEqual({
      from: 'Jane',
      answer: A_AGREED.after,
      claim: CLAIM_JANE,
      authority: 'blanket',
    });
  });

  it('reads a taken resolution at the taken side’s own rung', () => {
    expect(standingCandidate(B_TAKEN_JANE)).toEqual({
      from: 'Jane',
      answer: B_TAKEN_JANE.after,
      claim: CLAIM_JANE,
      authority: 'blanket',
    });
  });

  it('a facilitator re-answer has no claim', () => {
    const reanswered: AnswerLedgerRecord = {
      ...B_TAKEN_JANE,
      after: snap(3),
      decision: {
        kind: 'resolved',
        clash: 'divergence',
        choice: { kind: 'reanswer', rungId: 'choice-4' },
        by: 'facilitator',
        note: '',
      },
    };
    expect(standingCandidate(reanswered)).toEqual({
      from: 'facilitator',
      answer: reanswered.after,
      claim: null,
      authority: 'out-of-claim',
    });
  });

  it('is null when the record emptied the unit', () => {
    expect(standingCandidate({ ...A_AGREED, after: null })).toBeNull();
  });
});

describe('recordSentence', () => {
  const TAKEN: AnswerLedgerRecord = { ...B_TAKEN_JANE, questionId: 'q1', target: UNIT_A };

  it('reads a sole-source record', () => {
    expect(recordSentence(A_SOLE, WB)).toBe('only Alex answered — “r2” (SEAL 2)');
  });

  it('reads an agreed record', () => {
    expect(recordSentence(A_AGREED, WB)).toBe('Alex and Jane agreed — “r2” (SEAL 2)');
  });

  it('names the chosen option', () => {
    expect(recordSentence(TAKEN, WB)).toBe('Alex said “r2” (SEAL 2); Jane said “r1” (SEAL 1) → kept Jane — “r1” (SEAL 1)');
    expect(
      recordSentence({
        ...TAKEN,
        decision: {
          kind: 'resolved',
          clash: 'divergence',
          choice: { kind: 'take', from: 'Jane' },
          by: 'facilitator',
          note: 'her call',
        },
      }, WB),
    ).toBe('Alex said “r2” (SEAL 2); Jane said “r1” (SEAL 1) → kept Jane — “r1” (SEAL 1) “her call”');
  });

  it('reads a re-answer', () => {
    expect(
      recordSentence({
        ...TAKEN,
        after: snap(3),
        decision: {
          kind: 'resolved',
          clash: 'divergence',
          choice: { kind: 'reanswer', rungId: 'choice-4' },
          by: 'facilitator',
          note: '',
        },
      }, WB),
    ).toBe('Alex said “r2” (SEAL 2); Jane said “r1” (SEAL 1) → re-answered at “r3” (SEAL 3) — “r3” (SEAL 3)');
  });

  it('reads an emptied grain unit', () => {
    expect(
      recordSentence({
        ...A_SOLE,
        before: snap(2),
        after: null,
        decision: {
          kind: 'resolved',
          clash: 'grain',
          choice: { kind: 'grain', keep: 'strata' },
          by: 'facilitator',
          note: '',
        },
      }, WB),
    ).toBe('Alex said “r2” (SEAL 2) → kept the strata — nothing stands here');
  });

  it('reads an addition', () => {
    expect(
      recordSentence({
        kind: 'party',
        before: [],
        after: [{ id: 'northstar-edge', name: 'Northstar Edge', type: 't1', serves: [] }],
        decision: { kind: 'add', party: 'northstar-edge' },
        affectedTargets: [],
      }, WB),
    ).toBe('Northstar Edge (northstar-edge) joins the estate');
  });

  it('reads an absorb, its inherited serves and its note', () => {
    const absorbed = (note: string): LedgerRecord => ({
      kind: 'party',
      before: [
        { id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] },
        { id: 'acme-eu', name: 'Acme Cloud Europe SAS', type: 't1', serves: [] },
      ],
      after: [{ id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] }],
      decision: {
        kind: 'absorb',
        from: 'acme-eu',
        into: 'acme-cloud',
        name: 'Acme Cloud EU',
        by: 'facilitator',
        note,
      },
      affectedTargets: [],
    });
    expect(recordSentence(absorbed(''), WB)).toBe(
      'Acme Cloud Europe SAS and Acme Cloud EU are one provider — kept “Acme Cloud EU” as acme-cloud',
    );
    expect(recordSentence(absorbed('same contract'), WB)).toBe(
      'Acme Cloud Europe SAS and Acme Cloud EU are one provider — kept “Acme Cloud EU” as acme-cloud “same contract”',
    );
  });

  it('reads a rename, naming the serves the survivor inherited', () => {
    expect(
      recordSentence({
        kind: 'party',
        before: [
          { id: 'modelhouse', name: 'Modelhouse AI', type: 't1', serves: [] },
          { id: 'modelhouse', name: 'Modelhouse AI GmbH', type: 't1', serves: ['software-supply'] },
        ],
        after: [
          { id: 'modelhouse', name: 'Modelhouse AI GmbH', type: 't1', serves: ['software-supply'] },
        ],
        decision: {
          kind: 'rename',
          party: 'modelhouse',
          name: 'Modelhouse AI GmbH',
          by: 'facilitator',
          note: '',
        },
        affectedTargets: [],
      }, WB),
    ).toBe(
      'Modelhouse AI GmbH and Modelhouse AI are one provider — kept “Modelhouse AI GmbH” as modelhouse +software-supply',
    );
  });

  it('reads a split', () => {
    expect(
      recordSentence({
        kind: 'party',
        before: [{ id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] }],
        after: [
          { id: 'acme-cloud', name: 'Acme Cloud EU', type: 't1', serves: [] },
          { id: 'acme-cloud-jane', name: 'Acme Cloud Europe', type: 't1', serves: [] },
        ],
        decision: {
          kind: 'split',
          from: 'acme-cloud',
          id: 'acme-cloud-jane',
          by: 'facilitator',
          note: '',
        },
        affectedTargets: [],
      }, WB),
    ).toBe('Acme Cloud Europe kept separate as acme-cloud-jane');
  });
});

describe('unitHistory / ledgerUnits', () => {
  it('carries each record’s Landing envelope, without the batch', () => {
    const history = unitHistory(LEDGER, 'q1', UNIT_A);
    expect(history).toHaveLength(2);
    expect(history.map((e) => e.record.decision.kind)).toEqual(['sole-source', 'agreed']);
    expect(history[0].landing.participant).toBe('Alex');
    expect(history[0].landing.id).toBe(L1);
    expect('records' in history[0].landing).toBe(false);
    expect(history[1].landing.note).toBe('after the security discussion');
  });

  it('skips party records and non-matching units', () => {
    expect(unitHistory(LEDGER, 'q9', UNIT_A)).toEqual([]);
    expect(unitHistory(LEDGER, 'q2', UNIT_B)).toHaveLength(2);
  });

  it('groups units in first-appearance order across Landings', () => {
    const units = ledgerUnits(LEDGER);
    expect(units).toHaveLength(2);
    expect(units[0].questionId).toBe('q1');
    expect(units[0].entries).toHaveLength(2);
    expect(units[1].questionId).toBe('q2');
    expect(units[1].entries).toHaveLength(2);
  });
});

describe('ledgerEntries — the claim behind every candidate', () => {
  it('reads every entry as a sentence with its sources and its Landing', () => {
    const entries = ledgerEntries(unitHistory(LEDGER, 'q1', UNIT_A), WB, PARTIES);
    expect(entries).toHaveLength(2);
    expect(entries[0].landing.participant).toBe('Alex');
    expect(entries[0].sentence).toBe('only Alex answered — “r2” (SEAL 2)');
    expect(entries[0].sources).toEqual(['Alex · claim naming Storage']);
    expect(entries[1].sources).toEqual(['Alex · claim naming Storage', 'Jane · blanket claim']);
    expect(ledgerEntries(unitHistory(LEDGER, 'q2', UNIT_B), WB, PARTIES)[0].sources).toEqual([
      'Alex · outside their claims',
    ]);
  });

  it('names a claim’s dimensions before its parties', () => {
    const withBoth = unitHistory(
      [
        {
          ...LANDING_1,
          records: [
            {
              ...A_SOLE,
              candidates: [
                {
                  from: 'Alex',
                  answer: snap(2),
                  claim: { roles: ['ARCH'], dimensions: ['storage'], parties: ['acme'] },
                  authority: 'owner',
                },
              ],
            },
          ],
        },
      ],
      'q1',
      UNIT_A,
    );
    expect(ledgerEntries(withBoth, WB, PARTIES)[0].sources).toEqual([
      'Alex · claim naming Storage, Acme Cloud EU',
    ]);
  });

  it('an owner with no claim reads as the bare rung', () => {
    const noClaim = unitHistory(
      [
        {
          ...LANDING_1,
          records: [
            {
              ...A_SOLE,
              candidates: [{ from: 'Alex', answer: snap(2), claim: null, authority: 'owner' }],
            },
          ],
        },
      ],
      'q1',
      UNIT_A,
    );
    expect(ledgerEntries(noClaim, WB, PARTIES)[0].sources).toEqual(['Alex · claim owner']);
  });
});

describe('questionBlame', () => {
  it('reads one question’s units, labelled', () => {
    const blame = questionBlame(LEDGER, 'q1', WB, PARTIES);
    expect(blame).toHaveLength(1);
    expect(blame[0].label).toBe('Storage');
    expect(blame[0].target).toEqual({ kind: 'dimension', dimension: 'storage' });
    expect(blame[0].entries.map((e) => e.sentence)).toEqual([
      'only Alex answered — “r2” (SEAL 2)',
      'Alex and Jane agreed — “r2” (SEAL 2)',
    ]);
  });

  it('labels a party unit by name', () => {
    expect(questionBlame(LEDGER, 'q2', WB, PARTIES)[0].label).toBe('Acme Cloud EU');
  });

  it('an unknown question has no blame', () => {
    expect(questionBlame(LEDGER, 'nope', WB, PARTIES)).toEqual([]);
  });

  it('still reports a unit a grain decision emptied', () => {
    const emptied: AnswerLedgerRecord = {
      ...A_AGREED,
      before: snap(2),
      after: null,
      decision: {
        kind: 'resolved',
        clash: 'grain',
        choice: { kind: 'grain', keep: 'strata' },
        by: 'facilitator',
        note: '',
      },
    };
    const stratum: AnswerLedgerRecord = {
      ...A_SOLE,
      target: { kind: 'dimension-stratum', dimension: 'storage', stratum: 'chips' },
    };
    const blame = questionBlame(
      [LANDING_1, { ...LANDING_2, records: [emptied, stratum] }],
      'q1',
      WB,
      PARTIES,
    );
    expect(blame).toHaveLength(2);
    expect(blame.map((u) => u.label)).toEqual(['Storage', 'Storage · chips']);
  });
});

describe('ledgerSummary / disputedSentences', () => {
  it('counts landings, records, units and disputes', () => {
    expect(ledgerSummary(LEDGER)).toEqual({ landings: 2, records: 5, units: 2, disputed: 1 });
    expect(ledgerSummary([LANDING_1])).toEqual({ landings: 1, records: 2, units: 2, disputed: 0 });
    expect(ledgerSummary([])).toEqual({ landings: 0, records: 0, units: 0, disputed: 0 });
  });

  it('lists the disputed sentences only, in ledger order', () => {
    expect(disputedSentences(LEDGER, WB)).toEqual([
      'Alex said “r2” (SEAL 2); Jane said “r1” (SEAL 1) → kept Jane — “r1” (SEAL 1)',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  AnswerLedgerRecordSchema,
  AnswerSnapshotSchema,
  AssessmentSchema,
  AuthoritySchema,
  LandingSchema,
  LedgerCandidateSchema,
  ClashChoiceSchema,
  LedgerRecordSchema,
  PartyDecisionSchema,
} from './index';
import { BASE, G, INST, META } from './fixtures';

const L1 = '11111111-1111-4111-8111-111111111111';
const SNAP = { state: 'answered', rungId: 'choice-2', gesture: G };
const ANSWER = { questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'answered', rungId: 'choice-2', gesture: G };
const CLAIM = { roles: ['SEC'], dimensions: ['security'], parties: [] };
const SOLE = { kind: 'sole-source', from: 'Jane' };
const CAND = { from: 'Jane', answer: SNAP, claim: null, authority: 'out-of-claim' };
const JANE_CAND = { from: 'Jane', answer: ANSWER, claim: null, authority: 'out-of-claim' };

const record = (candidates: unknown, decision: unknown) => ({
  kind: 'answer',
  questionId: 'SOV-2.q1',
  target: { kind: 'assessment' },
  before: null,
  after: SNAP,
  candidates,
  decision,
});

const landing = (records: unknown) => ({ id: L1, at: 'T1', participant: 'Jane', records });

const partyRecord = (decision: unknown) => ({
  kind: 'party',
  before: [],
  after: [],
  decision,
  affectedTargets: [],
});

/** One Jane candidate under the decision being tested. */
const decided = (decision: unknown) => AnswerLedgerRecordSchema.safeParse(record([JANE_CAND], decision));

describe('the Landing envelope', () => {
  it('a Landing carries its identity once', () => {
    const parsed = LandingSchema.parse(landing([record([CAND], SOLE)]));
    expect(parsed.id).toBe(L1);
    expect(parsed.participant).toBe('Jane');
    expect('note' in parsed).toBe(false);
    const noted = LandingSchema.parse({ ...landing([record([CAND], SOLE)]), note: 'why' });
    expect(noted.note).toBe('why');
  });

  it('an empty Landing cannot be represented', () => {
    expect(LandingSchema.safeParse(landing([])).success).toBe(false);
  });

  it('a Landing id must be a UUID', () => {
    expect(LandingSchema.safeParse({ ...landing([record([CAND], SOLE)]), id: 'T1' }).success).toBe(false);
  });

  it('a record repeats no envelope fact', () => {
    const parsed = AnswerLedgerRecordSchema.parse({ ...record([CAND], SOLE), at: 'T1', landed: 'Jane' });
    expect('at' in parsed).toBe(false);
    expect('landed' in parsed).toBe(false);
  });

  it('a finalized parses, ledger defaults to [], and the old mergeEvents key is stripped', () => {
    const parsed = AssessmentSchema.parse({
      meta: META,
      workbook: BASE,
      parties: [INST],
      answers: [],
      mergeEvents: [],
    });
    expect(parsed.ledger).toEqual([]);
    expect('mergeEvents' in parsed).toBe(false);
  });
});

describe('answer records and their snapshots', () => {
  it('an answer record stores before and after', () => {
    const parsed = AnswerLedgerRecordSchema.parse(record([CAND], SOLE));
    expect(parsed.before).toBeNull();
    expect(parsed.after).toEqual(SNAP);
    const missing: Record<string, unknown> = { ...record([CAND], SOLE) };
    delete missing.before;
    expect(AnswerLedgerRecordSchema.safeParse(missing).success).toBe(false);
  });

  it('a snapshot carries no unit identity', () => {
    expect(
      AnswerSnapshotSchema.parse({
        state: 'answered',
        rungId: 'choice-2',
        gesture: G,
        questionId: 'q',
        target: { kind: 'assessment' },
      }),
    ).toEqual(SNAP);
  });

  it('a candidate answer is a snapshot', () => {
    const parsed = LedgerCandidateSchema.parse(JANE_CAND);
    expect('questionId' in parsed.answer).toBe(false);
  });

  it('an emptied unit carries a null answer', () => {
    const parsed = AnswerLedgerRecordSchema.parse({
      ...record([{ ...JANE_CAND, from: 'Alex' }], {
        kind: 'resolved',
        clash: 'grain',
        choice: { kind: 'grain', keep: 'strata' },
        by: 'facilitator',
        note: '',
      }),
      before: SNAP,
      after: null,
    });
    expect(parsed.after).toBeNull();
  });
});

describe('the authority rung on a candidate', () => {
  it('the authority ladder has exactly three rungs', () => {
    expect(AuthoritySchema.safeParse('owner').success).toBe(true);
    expect(AuthoritySchema.safeParse('owners').success).toBe(false);
  });

  it('a candidate keeps its claim verbatim, and null is legal', () => {
    const parsed = AnswerLedgerRecordSchema.parse(
      record([{ from: 'Jane', answer: ANSWER, claim: CLAIM, authority: 'owner' }], SOLE),
    );
    expect(parsed.candidates[0].claim).toEqual(CLAIM);
    expect(AnswerLedgerRecordSchema.parse(record([JANE_CAND], SOLE)).candidates[0].claim).toBeNull();
  });

  it('a candidate without its rung does not parse', () => {
    expect(AnswerLedgerRecordSchema.safeParse(record([{ from: 'Jane', answer: ANSWER, claim: null }], SOLE)).success).toBe(
      false,
    );
  });
});

describe('the decision on an answer record', () => {
  it('agreed needs two names and the one kept', () => {
    const candidates = [{ ...JANE_CAND, from: 'Alex' }, JANE_CAND];
    const agreed = (among: string[]) =>
      AnswerLedgerRecordSchema.safeParse(record(candidates, { kind: 'agreed', among, kept: 'Alex' }));
    expect(agreed(['Alex']).success).toBe(false);
    expect(agreed(['Alex', 'Jane']).success).toBe(true);
  });

  it('a resolved decision accepts an empty note', () => {
    expect(
      decided({
        kind: 'resolved',
        clash: 'divergence',
        choice: { kind: 'take', from: 'Jane' },
        by: 'facilitator',
        note: '',
      }).success,
    ).toBe(true);
  });

  it('a resolved decision must name its clash class', () => {
    const resolved = (clash?: unknown) => {
      const decision: Record<string, unknown> = {
        kind: 'resolved',
        choice: { kind: 'take', from: 'Jane' },
        by: 'facilitator',
        note: '',
      };
      if (clash !== undefined) decision.clash = clash;
      return decided(decision);
    };
    expect(resolved().success).toBe(false);
    expect(resolved('chatter').success).toBe(false);
    expect(resolved('grain').success).toBe(true);
  });

  it('a grain choice keeps one depth', () => {
    const kept = (keep: string) =>
      decided({
        kind: 'resolved',
        clash: 'grain',
        choice: { kind: 'grain', keep },
        by: 'facilitator',
        note: '',
      });
    expect(kept('strata').success).toBe(true);
    expect(kept('roll-up').success).toBe(true);
    expect(kept('both').success).toBe(false);
  });

  it('an unknown decision kind is refused', () => {
    expect(decided({ kind: 'chosen' }).success).toBe(false);
  });
});

describe('party records and party decisions', () => {
  it('each party decision kind is typed', () => {
    const decisions = [
      { kind: 'add', party: 'northstar-edge' },
      { kind: 'absorb', from: 'acme-eu', into: 'acme-cloud', name: 'Acme Cloud EU', by: 'facilitator', note: '' },
      { kind: 'rename', party: 'modelhouse', name: 'Modelhouse AI GmbH', by: 'facilitator', note: '' },
      { kind: 'split', from: 'acme-cloud', id: 'acme-cloud-jane', by: 'facilitator', note: '' },
    ];
    for (const decision of decisions) {
      expect(LedgerRecordSchema.safeParse(partyRecord(decision)).success).toBe(true);
    }
    expect(LedgerRecordSchema.safeParse(partyRecord({ kind: 'merge', into: 'x' })).success).toBe(false);
  });

  it('a party record keeps both affected sets and its rewrites', () => {
    const rewrite = {
      questionId: 'SOV-2.q1',
      before: { kind: 'party', party: 'jane:acme' },
      after: { kind: 'party', party: 'acme' },
    };
    const renamed = { id: 'modelhouse', name: 'Modelhouse AI GmbH', type: 'supplier', serves: ['software-supply'] };
    const parsed = LedgerRecordSchema.parse({
      kind: 'party',
      before: [{ id: 'modelhouse', name: 'Modelhouse AI', type: 'supplier', serves: [] }, renamed],
      after: [renamed],
      decision: { kind: 'rename', party: 'modelhouse', name: 'Modelhouse AI GmbH', by: 'facilitator', note: '' },
      affectedTargets: [rewrite],
    });
    expect(parsed.kind).toBe('party');
    if (parsed.kind !== 'party') return;
    expect(parsed.before.map((p) => p.id)).toEqual(['modelhouse', 'modelhouse']);
    expect(parsed.affectedTargets).toEqual([rewrite]);
  });

  it('a party decision is keyed by the addition it settles', () => {
    const decision = {
      added: 'acme-eu',
      choice: { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud EU' },
      note: '',
    };
    expect(PartyDecisionSchema.safeParse(decision).success).toBe(true);
    expect(PartyDecisionSchema.safeParse({ ...decision, added: '' }).success).toBe(false);
    expect(PartyDecisionSchema.safeParse({ ...decision, choice: { kind: 'merge', into: 'acme-cloud' } }).success).toBe(
      false,
    );
  });
});

describe('a re-answer choice names a rung (instrument-S1)', () => {
  it('parses a rungId and rejects a seal', () => {
    expect(ClashChoiceSchema.safeParse({ kind: 'reanswer', rungId: 'choice-3' }).success).toBe(true);
    expect(ClashChoiceSchema.safeParse({ kind: 'reanswer', seal: 3 }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from './index';
import { BASE, G, INST, META, WB_DIM, messagesOf } from './fixtures';

const PARTICIPANT_META = { ...META, participant: { name: 'Alice' } };

const partial = (fields: Record<string, unknown>) => ({
  meta: PARTICIPANT_META,
  workbook: WB_DIM,
  parties: [INST],
  claims: [],
  partiesAdded: [],
  answers: [],
  ...fields,
});

describe('AssessmentSchema envelope', () => {
  it('parses an assessment with meta.estate, parties, and answers with gestures', () => {
    const parsed = AssessmentSchema.parse({
      meta: META,
      workbook: BASE,
      parties: [INST],
      answers: [{ questionId: 'SOV-2.q1', target: { kind: 'assessment' }, state: 'answered', rungId: 'choice-2', gesture: G }],
    });
    expect(parsed.meta.estate).toBe('Primary estate');
    expect(parsed.parties).toEqual([INST]);
    expect(parsed.answers[0].state).toBe('answered');
    expect(parsed.ledger).toEqual([]);
  });

  it('rejects meta with no estate', () => {
    expect(
      AssessmentSchema.safeParse({
        meta: { workbookId: 'wb', workbookVersion: '1.0.0' },
        workbook: BASE,
        parties: [INST],
        answers: [],
      }).success,
    ).toBe(false);
  });

  it('a lineage-free assessment (no workbook-assessment) is rejected', () => {
    const result = AssessmentSchema.safeParse({
      meta: { workbookId: 'wb', workbookVersion: '1.0.0', estate: 'E' },
      workbook: BASE,
      parties: [INST],
      answers: [],
    });
    expect(result.success).toBe(false);
    expect(
      result.success ? false : result.error.issues.some((i) => i.path.join('.') === 'meta.workbookAssessment'),
    ).toBe(true);
  });
});

describe('the assessed party (invariant #4)', () => {
  const roster = (parties: unknown[]) =>
    AssessmentSchema.safeParse({ meta: META, workbook: BASE, parties, answers: [] });

  it('parses parties with id, name, type and serves', () => {
    const idp = { id: 'idp', name: 'IdP', type: 'subprocessor', serves: ['compute'] };
    const parsed = AssessmentSchema.parse({ meta: META, workbook: BASE, parties: [INST, idp], answers: [] });
    expect(parsed.parties).toEqual([INST, idp]);
  });

  it("defaults a party's serves to []", () => {
    const parsed = AssessmentSchema.parse({
      meta: META,
      workbook: BASE,
      parties: [INST, { id: 'idp', name: 'IdP', type: 'subprocessor' }],
      answers: [],
    });
    expect(parsed.parties[1].serves).toEqual([]);
  });

  it('rejects an unknown party type', () => {
    expect(roster([INST, { id: 'x', name: 'X', type: 'vendor', serves: [] }]).success).toBe(false);
  });

  it('rejects an empty roster', () => {
    const messages = messagesOf(roster([]));
    expect(messages.some((m) => /Exactly one party must be the assessed/.test(m))).toBe(true);
  });

  it('rejects a roster with no concrete assessed party', () => {
    expect(roster([{ id: 'p1', name: 'P', type: 'primary-provider', serves: [] }]).success).toBe(false);
  });

  it('rejects a roster with two concrete assessed parties', () => {
    expect(roster([INST, { id: 'inst2', name: 'I2', type: 'institution', serves: [] }]).success).toBe(false);
  });
});

describe('partial or finalized, never a mixture (delivery-S2)', () => {
  it('assessment meta accepts workbookAssessment and a name-only participant', () => {
    const parsed = AssessmentSchema.parse(partial({ workbook: BASE }));
    expect(parsed.meta.participant?.name).toBe('Alice');
    expect(parsed.meta.workbookAssessment).toBe('wa-1');
  });

  it('a finalized (workbook-assessment, no participant) parses', () => {
    const parsed = AssessmentSchema.parse({ meta: META, workbook: BASE, parties: [INST], answers: [] });
    expect(parsed.meta.workbookAssessment).toBe('wa-1');
    expect(parsed.meta.participant).toBeUndefined();
  });

  it('a mixed shape (participant without claims/partiesAdded) is rejected', () => {
    const result = AssessmentSchema.safeParse({
      meta: PARTICIPANT_META,
      workbook: BASE,
      parties: [INST],
      answers: [],
    });
    expect(messagesOf(result)).toContain(
      'An assessment is a partial (participant, claims, and partiesAdded together) or a finalized (none of them).',
    );
  });
});

describe('the claim log', () => {
  it('a claim with no dimensions defaults to [], and parties to []', () => {
    const parsed = AssessmentSchema.parse(
      partial({ claims: [{ roles: ['ARCH'], dimensions: ['compute'] }, { roles: ['SEC'], dimensions: [] }] }),
    );
    expect(parsed.claims?.[0].roles).toEqual(['ARCH']);
    expect(parsed.claims?.[1].dimensions).toEqual([]);
    expect(parsed.claims?.[0].parties).toEqual([]);
  });

  it('a claim naming a seeded provider parses', () => {
    const parsed = AssessmentSchema.parse(
      partial({ claims: [{ roles: ['ARCH'], dimensions: [], parties: ['inst'] }] }),
    );
    expect(parsed.claims?.[0].parties).toEqual(['inst']);
  });

  it('a claim naming an unknown party is rejected', () => {
    const result = AssessmentSchema.safeParse(
      partial({ claims: [{ roles: ['ARCH'], dimensions: [], parties: ['ghost'] }] }),
    );
    expect(messagesOf(result)).toContain('Claim names unknown party "ghost".');
  });

  it('a claim naming an unknown role is rejected', () => {
    const result = AssessmentSchema.safeParse(partial({ claims: [{ roles: ['CFO'], dimensions: [] }] }));
    expect(messagesOf(result)[0]).toBe('Claim names unknown role "CFO".');
  });

  it('a claim naming an unknown dimension is rejected', () => {
    const result = AssessmentSchema.safeParse(partial({ claims: [{ roles: ['ARCH'], dimensions: ['nope'] }] }));
    expect(messagesOf(result)).toContain('Claim names unknown dimension "nope".');
  });

  it('a claim with no roles is rejected (roles .min(1))', () => {
    expect(AssessmentSchema.safeParse(partial({ claims: [{ roles: [], dimensions: [] }] })).success).toBe(false);
  });
});

describe('partiesAdded (delivery-S4)', () => {
  const added = (party: Record<string, unknown>) => AssessmentSchema.safeParse(partial({ partiesAdded: [party] }));
  const OKTA = { id: 'alice:party-1', name: 'Okta', type: 'subprocessor', serves: ['compute'] };

  it('(a) accepts partiesAdded on a partial', () => {
    const parsed = AssessmentSchema.parse(partial({ partiesAdded: [OKTA] }));
    expect(parsed.partiesAdded?.[0].id).toBe('alice:party-1');
  });

  it('(b) rejects an added party of the assessed type', () => {
    expect(messagesOf(added({ ...OKTA, type: 'institution' }))).toContain(
      'Added party alice:party-1 may not be the assessed party; add only third parties.',
    );
  });

  it('(c) rejects an added party of an unknown type', () => {
    expect(messagesOf(added({ ...OKTA, type: 'nope' }))).toContain(
      'Added party alice:party-1 has unknown party type "nope".',
    );
  });

  it('(d) rejects an added party that serves an unknown dimension', () => {
    expect(messagesOf(added({ ...OKTA, serves: ['nope'] }))).toContain(
      'Added party alice:party-1 serves unknown dimension "nope".',
    );
  });
});

describe('an assessment names only questions and rungs its workbook authors (instrument-S1)', () => {
  const L1 = '11111111-1111-4111-8111-111111111111';
  const answered = (questionId: string, rungId: string) => ({
    questionId,
    target: { kind: 'assessment' },
    state: 'answered',
    rungId,
    gesture: G,
  });
  const withAnswers = (answers: unknown[]) =>
    AssessmentSchema.safeParse({ meta: META, workbook: BASE, parties: [INST], answers });
  const withRecord = (record: unknown) =>
    AssessmentSchema.safeParse({
      meta: META,
      workbook: BASE,
      parties: [INST],
      answers: [],
      ledger: [{ id: L1, at: '2026-01-01T00:00:00Z', participant: 'Jane', records: [record] }],
    });

  it('rejects a standing answer on an unknown question', () => {
    expect(messagesOf(withAnswers([answered('q9', 'choice-1')]))).toContain(
      'Answer 0 names unknown question "q9".',
    );
  });

  it('rejects a standing answer at an unauthored rung', () => {
    expect(messagesOf(withAnswers([answered('SOV-2.q1', 'choice-9')]))).toContain(
      'Answer 0 on SOV-2.q1 names unknown rung "choice-9".',
    );
  });

  it('rejects a ledger record whose after names an unauthored rung', () => {
    const record = {
      kind: 'answer',
      questionId: 'SOV-2.q1',
      target: { kind: 'assessment' },
      before: null,
      after: { state: 'answered', rungId: 'choice-9', gesture: G },
      candidates: [
        {
          from: 'Jane',
          answer: { state: 'answered', rungId: 'choice-1', gesture: G },
          claim: null,
          authority: 'out-of-claim',
        },
      ],
      decision: { kind: 'sole-source', from: 'Jane' },
    };
    expect(messagesOf(withRecord(record))).toContain(
      'Landing 0 record 0 names unknown rung "choice-9" on SOV-2.q1.',
    );
  });

  it('rejects a resolved re-answer at an unauthored rung', () => {
    const record = {
      kind: 'answer',
      questionId: 'SOV-2.q1',
      target: { kind: 'assessment' },
      before: null,
      after: { state: 'answered', rungId: 'choice-1', gesture: G },
      candidates: [
        {
          from: 'Jane',
          answer: { state: 'answered', rungId: 'choice-1', gesture: G },
          claim: null,
          authority: 'out-of-claim',
        },
      ],
      decision: {
        kind: 'resolved',
        clash: 'divergence',
        choice: { kind: 'reanswer', rungId: 'choice-9' },
        by: 'Fac',
        note: '',
      },
    };
    expect(messagesOf(withRecord(record))).toContain(
      'Landing 0 record 0 names unknown rung "choice-9" on SOV-2.q1.',
    );
  });
});

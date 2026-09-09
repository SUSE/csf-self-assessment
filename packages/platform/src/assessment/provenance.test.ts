import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { AnswerLedgerRecord, Landing, Party } from '../schema';
import { snapshotOf } from '../merge/snapshot';
import {
  AUTHOR_QA_PROVENANCE,
  addedProviderFrom,
  assessmentOf,
  checkAssessmentIntegrity,
  defaultParties,
  nextAddedPartyId,
} from './index';
import { ASSESSMENT, BASE, BASE_WB, DIM_WB, G, INST } from './fixtures';

const ASSESSED_ONLY = WorkbookSchema.parse({
  ...BASE,
  parties: [{ id: 'institution', name: 'Institution', kind: 'assessed' }],
});

const partialOf = (fields: Record<string, unknown>) =>
  assessmentOf(BASE_WB, 'E', [INST], [], {
    kind: 'partial',
    workbookAssessment: 'wa-1',
    participant: { name: 'A' },
    claims: [],
    partiesAdded: [],
    ...fields,
  });

describe('assessmentOf', () => {
  it('builds a self-contained finalized assessment (the Author-QA reading)', () => {
    expect(assessmentOf(BASE_WB, 'Acme', [INST], [], AUTHOR_QA_PROVENANCE)).toEqual({
      meta: { workbookId: 'wb', workbookVersion: '1.0.0', estate: 'Acme', workbookAssessment: 'author-qa' },
      workbook: BASE_WB,
      parties: [INST],
      ledger: [],
      answers: [],
    });
  });

  it('the Author-QA reading is a finalized with no participant or claims', () => {
    const a = assessmentOf(BASE_WB, 'E', [INST], [], AUTHOR_QA_PROVENANCE);
    expect(a.meta.workbookAssessment).toBe('author-qa');
    expect('participant' in a.meta).toBe(false);
    expect('claims' in a).toBe(false);
    expect(a.ledger).toEqual([]);
  });

  it('partial writes workbookAssessment, participant, and the claim log, with an empty ledger', () => {
    const claims = [{ roles: ['ARCH'], dimensions: ['compute'], parties: [] }];
    const a = partialOf({ claims });
    expect(a.meta.participant?.name).toBe('A');
    expect(a.claims).toEqual(claims);
    expect(a.ledger).toEqual([]);
  });

  it('partial writes partiesAdded', () => {
    const added: Party[] = [{ id: 'A:party-1', name: 'Okta', type: 'subprocessor', serves: [] }];
    const a = partialOf({ partiesAdded: added });
    expect(a.partiesAdded).toEqual(added);
  });

  it('a finalized omits partiesAdded', () => {
    const finalized = assessmentOf(BASE_WB, 'E', [INST], [], {
      kind: 'finalized',
      workbookAssessment: 'wa-1',
      ledger: [],
    });
    expect('partiesAdded' in finalized).toBe(false);
  });

  it('finalized writes workbookAssessment and the ledger but never a participant', () => {
    const answer = { questionId: 'SOV-2.q1', target: ASSESSMENT, state: 'answered' as const, rungId: 'choice-2', gesture: G };
    const record: AnswerLedgerRecord = {
      kind: 'answer',
      questionId: 'SOV-2.q1',
      target: ASSESSMENT,
      before: null,
      after: snapshotOf(answer),
      candidates: [{ from: 'Alice', answer: snapshotOf(answer), claim: null, authority: 'out-of-claim' }],
      decision: { kind: 'sole-source', from: 'Alice' },
    };
    const landing: Landing = {
      id: '11111111-1111-4111-8111-111111111111',
      at: 'T1',
      participant: 'Alice',
      records: [record],
    };
    const a = assessmentOf(BASE_WB, 'E', [INST], [], { kind: 'finalized', workbookAssessment: 'wa-1', ledger: [landing] });
    expect(a.meta.workbookAssessment).toBe('wa-1');
    expect(a.meta.participant).toBeUndefined();
    expect(a.claims).toBeUndefined();
    expect(a.ledger).toEqual([landing]);
  });
});

describe('defaultParties', () => {
  it('seeds the assessed party (serving nothing) and a provider serving every dimension', () => {
    expect(defaultParties(DIM_WB)).toEqual([
      INST,
      {
        id: 'primary-provider',
        name: 'Primary provider',
        type: 'primary-provider',
        serves: ['compute', 'network', 'edge'],
      },
    ]);
  });

  it('an institution-only workbook (no third-party type) yields just the assessed party', () => {
    expect(defaultParties(ASSESSED_ONLY)).toEqual([INST]);
  });
});

describe('nextAddedPartyId', () => {
  const taken = [{ id: 'Alice:party-1', name: 'X', type: 'primary-provider' as const, serves: [] }];

  it('mints party-1 against an empty set', () => {
    expect(nextAddedPartyId([], 'Alice')).toBe('Alice:party-1');
  });

  it('skips taken ids', () => {
    expect(nextAddedPartyId(taken, 'Alice')).toBe('Alice:party-2');
  });

  it('namespaces by participant name', () => {
    expect(nextAddedPartyId(taken, 'Bob')).toBe('Bob:party-1');
  });
});

describe('addedProviderFrom', () => {
  it('mints a name-only third party, trimming the name and picking the first third-party type', () => {
    expect(addedProviderFrom(BASE_WB, [INST], 'Alice', '  Backup SaaS BV  ')).toEqual({
      id: 'Alice:party-1',
      name: 'Backup SaaS BV',
      type: 'primary-provider',
      serves: [],
    });
  });

  it('is null on a blank/whitespace name', () => {
    expect(addedProviderFrom(BASE_WB, [INST], 'Alice', '   ')).toBe(null);
  });

  it('is null when the workbook declares no third-party type', () => {
    expect(addedProviderFrom(ASSESSED_ONLY, [INST], 'Alice', 'X')).toBe(null);
  });
});

describe('checkAssessmentIntegrity', () => {
  it('accepts a matching declared/embedded identity', () => {
    expect(checkAssessmentIntegrity(assessmentOf(BASE_WB, 'E', [INST], [], AUTHOR_QA_PROVENANCE))).toEqual({ ok: true });
  });

  it('refuses a version mismatch', () => {
    expect(
      checkAssessmentIntegrity({
        meta: { workbookId: 'wb', workbookVersion: '9.9.9', estate: 'E', workbookAssessment: 'wa-1' },
        workbook: BASE_WB,
        parties: [INST],
        ledger: [],
        answers: [],
      }),
    ).toEqual({ ok: false, declared: { id: 'wb', version: '9.9.9' }, embedded: { id: 'wb', version: '1.0.0' } });
  });
});

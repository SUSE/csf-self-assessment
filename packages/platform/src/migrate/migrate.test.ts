import { describe, expect, it } from 'vitest';
import { migrateV1ToV2 } from './transform-v1-to-v2';
import { sniffPayload } from './sniff';

describe('sniffPayload', () => {
  it('identifies v1.0 workbook without schemaVersion', () => {
    const wb = {
      meta: { id: 'wb', version: '1.0.0' },
      sealLevels: [],
      objectives: [
        {
          id: 'obj-1',
          questions: [{ id: 'q1', grain: 'party', axis: 'assessment' }],
        },
      ],
    };
    expect(sniffPayload(wb)).toEqual({
      fileType: 'workbook',
      version: '1.0',
      hasLegacyGrain: true,
    });
  });

  it('identifies v2.0 workbook with schemaVersion 2.0', () => {
    const wb = {
      schemaVersion: '2.0',
      meta: { id: 'wb', version: '1.0.0' },
      sealLevels: [],
      objectives: [
        {
          id: 'obj-1',
          questions: [{ id: 'q1', scope: 'party', axis: 'assessment' }],
        },
      ],
    };
    expect(sniffPayload(wb)).toEqual({
      fileType: 'workbook',
      version: '2.0',
      hasLegacyGrain: false,
    });
  });

  it('identifies assessment with embedded v1.0 workbook', () => {
    const assessment = {
      meta: { workbookAssessment: 'wa-1' },
      answers: [],
      workbook: {
        meta: { id: 'wb' },
        objectives: [
          {
            id: 'obj-1',
            questions: [{ id: 'q1', grain: 'dimension', appliesTo: ['storage'] }],
          },
        ],
      },
    };
    expect(sniffPayload(assessment)).toEqual({
      fileType: 'assessment',
      version: '1.0',
      hasLegacyGrain: true,
    });
  });

  it('identifies unknown payloads', () => {
    expect(sniffPayload(null)).toEqual({ fileType: 'unknown', version: 'unknown', hasLegacyGrain: false });
    expect(sniffPayload([])).toEqual({ fileType: 'unknown', version: 'unknown', hasLegacyGrain: false });
    expect(sniffPayload({ foo: 'bar' })).toEqual({ fileType: 'unknown', version: 'unknown', hasLegacyGrain: false });
  });
});

describe('migrateV1ToV2', () => {
  it('migrates a v1.0 workbook to v2.0 and adds schemaVersion', () => {
    const v1Workbook = {
      meta: { id: 'test-wb', version: '1.0.0' },
      sealLevels: [{ seal: 0, name: 'S0', description: 'd0' }],
      objectives: [
        {
          id: 'obj-1',
          name: 'Objective 1',
          questions: [
            {
              id: 'q-party',
              grain: 'party',
              axis: 'party',
              text: 'Party question',
              why: 'why',
              role: 'SEC',
              defaultMateriality: 'material',
              ladder: [],
            },
            {
              id: 'q-dim',
              grain: 'dimension',
              appliesTo: ['compute'],
              text: 'Dim question',
              why: 'why',
              role: 'SEC',
              defaultMateriality: 'material',
              ladder: [],
            },
          ],
        },
      ],
    };

    const result = migrateV1ToV2(v1Workbook);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.stats).toEqual({
      detectedType: 'workbook',
      fromVersion: '1.0',
      toVersion: '2.0',
      questionsMigrated: 2,
      clashesUpdated: 0,
    });

    const migrated = result.migrated as typeof v1Workbook & { schemaVersion: string; objectives: { questions: Record<string, unknown>[] }[] };
    expect(migrated.schemaVersion).toBe('2.0');

    const q1 = migrated.objectives[0].questions[0];
    const q2 = migrated.objectives[0].questions[1];

    expect(q1.scope).toBe('party');
    expect('grain' in q1).toBe(false);
    expect(q1.axis).toBe('party');

    expect(q2.scope).toBe('dimension');
    expect('grain' in q2).toBe(false);
    expect(q2.appliesTo).toEqual(['compute']);
  });

  it('migrates an assessment including embedded workbook and ledger and adds schemaVersion', () => {
    const v1Assessment = {
      meta: { workbookAssessment: 'wa-1', estate: 'Test Estate' },
      answers: [],
      workbook: {
        meta: { id: 'test-wb', version: '1.0.0' },
        objectives: [
          {
            id: 'obj-1',
            questions: [
              { id: 'q1', grain: 'dimension', appliesTo: ['storage'] },
            ],
          },
        ],
      },
      ledger: [
        {
          id: 'landing-1',
          participant: 'Jane',
          records: [
            {
              kind: 'answer',
              questionId: 'q1',
              decision: {
                kind: 'resolved',
                clash: 'scope',
                choice: { kind: 'take', from: 'Jane' },
              },
            },
            {
              kind: 'answer',
              questionId: 'q1',
              decision: {
                kind: 'resolved',
                clash: 'grain',
                choice: { kind: 'grain', keep: 'strata' },
              },
            },
          ],
        },
      ],
    };

    const result = migrateV1ToV2(v1Assessment);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.stats.detectedType).toBe('assessment');
    expect(result.stats.fromVersion).toBe('1.0');
    expect(result.stats.toVersion).toBe('2.0');
    expect(result.stats.questionsMigrated).toBe(1);
    expect(result.stats.clashesUpdated).toBe(3);

    const migrated = result.migrated as Record<string, unknown>;
    expect(migrated.schemaVersion).toBe('2.0');

    const wb = migrated.workbook as { schemaVersion: string; objectives: { questions: Record<string, unknown>[] }[] };
    expect(wb.schemaVersion).toBe('2.0');
    expect(wb.objectives[0].questions[0].scope).toBe('dimension');
    expect('grain' in wb.objectives[0].questions[0]).toBe(false);

    const ledger = migrated.ledger as { records: { decision: { clash: string; choice: { kind: string } } }[] }[];
    expect(ledger[0].records[0].decision.clash).toBe('applicability');
    expect(ledger[0].records[1].decision.clash).toBe('depth');
    expect(ledger[0].records[1].decision.choice.kind).toBe('depth');
  });

  it('is idempotent on already-migrated v2.0 payload', () => {
    const v2Workbook = {
      schemaVersion: '2.0',
      meta: { id: 'test-wb', version: '2.0.0' },
      sealLevels: [],
      objectives: [
        {
          id: 'obj-1',
          questions: [
            { id: 'q1', scope: 'party', axis: 'assessment' },
          ],
        },
      ],
    };

    const result = migrateV1ToV2(v2Workbook);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.stats).toEqual({
      detectedType: 'workbook',
      fromVersion: '2.0',
      toVersion: '2.0',
      questionsMigrated: 0,
      clashesUpdated: 0,
    });
    expect(result.migrated).toEqual(v2Workbook);
  });

  it('accepts JSON string and parses it', () => {
    const jsonStr = JSON.stringify({
      meta: { id: 'wb' },
      sealLevels: [],
      objectives: [{ id: 'o1', questions: [{ id: 'q1', grain: 'party' }] }],
    });

    const result = migrateV1ToV2(jsonStr);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stats.questionsMigrated).toBe(1);
    expect((result.migrated as Record<string, unknown>).schemaVersion).toBe('2.0');
  });

  it('returns failure on invalid JSON string or non-matching payload', () => {
    const badJson = '{ invalid json';
    expect(migrateV1ToV2(badJson)).toEqual({
      ok: false,
      error: expect.stringContaining('Invalid JSON'),
    });

    const wrongPayload = { randomKey: 123 };
    expect(migrateV1ToV2(wrongPayload)).toEqual({
      ok: false,
      error: expect.stringContaining('Unrecognized file format'),
    });
  });
});

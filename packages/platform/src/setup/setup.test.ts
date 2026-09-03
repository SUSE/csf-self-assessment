import { describe, expect, it } from 'vitest';
import { WorkbookAssessmentSchema, WorkbookSchema } from '../schema';
import type { Party } from '../schema';
import { checkWorkbookAssessmentIntegrity, workbookAssessmentOf } from './index';

const ROLES = [
  { id: 'ARCH', name: 'Architecture' },
  { id: 'LEG', name: 'Legal' },
];

const PARTIES = [
  { id: 'institution', name: 'Institution', kind: 'assessed' },
  { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
];

const wb = WorkbookSchema.parse({
  meta: { id: 'w', version: '1', title: 'W' },
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 4, name: 'S4', description: 'd' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
  ],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'O1',
      name: 'One',
      weight: 100,
      questions: [
        { id: 'q1', grain: 'party', text: 't', why: 'w', role: 'LEG', defaultMateriality: 'material', ladder: [{ id: 'choice-1', description: 'r', points: 0, seal: 0 }] },
      ],
    },
  ],
});

const parties: Party[] = [
  { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
  { id: 'primary', name: 'Primary provider', type: 'primary-provider', serves: ['compute', 'storage'] },
];

const wa = workbookAssessmentOf({
  workbook: wb,
  estate: 'Acme',
  parties,
  id: 'wa-1',
  createdAt: '2026-08-02T00:00:00Z',
});

describe('setup module', () => {
  it('workbookAssessmentOf embeds identity, estate, parties, and the workbook', () => {
    expect(wa.meta).toEqual({
      id: 'wa-1',
      estate: 'Acme',
      workbookId: wb.meta.id,
      workbookVersion: wb.meta.version,
      createdAt: '2026-08-02T00:00:00Z',
    });
    expect(wa.workbook).toBe(wb);
    expect(wa.parties).toBe(parties);
  });

  it('the workbook-assessment round-trips through WorkbookAssessmentSchema', () => {
    expect(WorkbookAssessmentSchema.safeParse(JSON.parse(JSON.stringify(wa))).success).toBe(true);
  });

  it('checkWorkbookAssessmentIntegrity accepts an honest artifact and refuses a doctored version', () => {
    expect(checkWorkbookAssessmentIntegrity(wa)).toEqual({ ok: true });
    const doctored = { ...wa, meta: { ...wa.meta, workbookVersion: '9.9.9' } };
    const result = checkWorkbookAssessmentIntegrity(doctored);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.declared.version).toBe('9.9.9');
      expect(result.embedded.version).toBe(wb.meta.version);
    }
  });
});

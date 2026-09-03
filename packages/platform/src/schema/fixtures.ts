import type { SafeParseReturnType } from 'zod';

export const ROLES = [
  { id: 'ARCH', name: 'Architecture' },
  { id: 'OPS', name: 'Platform ops' },
  { id: 'SEC', name: 'Security' },
  { id: 'LEG', name: 'Legal' },
  { id: 'PROC', name: 'Procurement' },
  { id: 'FAC', name: 'Facilities/ESG' },
];

export const PARTIES = [
  { id: 'institution', name: 'Institution', kind: 'assessed' },
  { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
  { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
  { id: 'supplier', name: 'Supplier', kind: 'third-party' },
];

export const INST = { id: 'inst', name: 'Institution', type: 'institution', serves: [] };

// One valid base workbook; each case clones it (structuredClone, Node 22) and
// breaks exactly one thing, so a failure isolates the refinement under test.
export const BASE = {
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd0' },
    { seal: 1, name: 'S1', description: 'd1' },
    { seal: 2, name: 'S2', description: 'd2' },
    { seal: 4, name: 'S4', description: 'd4' },
  ],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'SOV-2',
      name: 'Legal',
      weight: 100,
      questions: [
        {
          id: 'SOV-2.q1',
          grain: 'party',
          text: 'q?',
          why: 'because',
          role: 'LEG',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'r0', points: 0, seal: 0 },
            { id: 'choice-2', description: 'r2', points: 50, seal: 2 },
            { id: 'choice-3', description: 'r4', points: 100, seal: 4 },
          ],
        },
      ],
    },
  ],
};

export const DIM = { id: 'compute', name: 'Compute', critical: true };
export const DIM_Q = {
  id: 'SOV-2.d1',
  grain: 'dimension',
  appliesTo: ['compute'],
  text: 'q?',
  why: 'b',
  role: 'OPS',
  defaultMateriality: 'material',
  ladder: [{ id: 'choice-1', description: 'r0', points: 0, seal: 0 }],
};

export const WB_DIM = { ...BASE, dimensions: [DIM] };

export const META = {
  workbookId: 'wb',
  workbookVersion: '1.0.0',
  estate: 'Primary estate',
  workbookAssessment: 'wa-1',
};

export const G = { groupId: 'g1', placement: 'individual' };
export const GG = { groupId: 'g2', placement: 'group' };

export const messagesOf = (result: SafeParseReturnType<unknown, unknown>): string[] =>
  result.success ? [] : result.error.issues.map((i) => i.message);

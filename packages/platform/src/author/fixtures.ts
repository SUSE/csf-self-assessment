import type { Recommendation, Workbook } from '../schema';

// Two dimensions, one objective, one question — the smallest workbook a link can point into.
export const linkableWorkbook = (): Workbook => ({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  frontSheet: [],
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 2, name: 'S2', description: 'd' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
  ],
  roles: [{ id: 'ARCH', name: 'Architect' }],
  parties: [],
  objectives: [
    {
      id: 'SOV-A',
      name: 'Alpha',
      weight: 100,
      questions: [
        {
          id: 'A.compute',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'How is compute governed?',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [{ id: 'choice-1', description: 'none', points: 0, seal: 0 }],
        },
      ],
    },
  ],
  testEstates: [],
  recommendations: [],
});

export const recOf = (wb: Workbook, id: string): Recommendation => {
  const rec = wb.recommendations.find((r) => r.id === id);
  if (rec === undefined) throw new Error(`no recommendation ${id}`);
  return rec;
};

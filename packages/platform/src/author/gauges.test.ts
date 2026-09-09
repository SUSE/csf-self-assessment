import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { DraftWorkbookSchema, WorkbookSchema } from '../schema';
import { authorGauges } from './gauges';
import { starterWorkbook } from './starter';

const PARTIES = [
  { id: 'institution', name: 'Institution', kind: 'assessed' },
  { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
  { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
  { id: 'supplier', name: 'Supplier', kind: 'third-party' },
];

const sample: Workbook = WorkbookSchema.parse({
  meta: {
    id: 'csf-sample',
    version: '0.5.0',
    title: 'Cloud Sovereignty Self-Assessment — Sample (S7)',
  },
  sealLevels: [
    { seal: 0, name: 'No Sovereignty', description: 'No sovereign control; fully dependent on a foreign-controlled provider.' },
    { seal: 1, name: 'Jurisdictional Sovereignty', description: 'Operated under EU jurisdiction, but control can still be overridden from outside.' },
    { seal: 2, name: 'Data Sovereignty', description: 'The EU controls the data even under stress; outside parties cannot compel access.' },
    { seal: 3, name: 'Technological Sovereignty', description: 'The EU controls the technology and can keep operating if a foreign supplier withdraws.' },
    { seal: 4, name: 'Full Digital Sovereignty', description: 'Complete sovereign control across law, data, and technology, down to the supply chain.' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
    { id: 'storage', name: 'Storage', strata: ['service', 'software', 'hardware', 'chips'], critical: true },
    { id: 'network', name: 'Network', critical: true },
    { id: 'iam', name: 'IAM', critical: true },
    { id: 'platform', name: 'Platform', critical: true },
    { id: 'security', name: 'Security', critical: true },
    { id: 'aiml', name: 'AI/ML platform', critical: false },
    { id: 'edge', name: 'Edge', critical: false },
    { id: 'facilities', name: 'Facilities', critical: false },
  ],
  roles: [
    { id: 'ARCH', name: 'Architecture' },
    { id: 'OPS', name: 'Platform ops' },
    { id: 'SEC', name: 'Security' },
    { id: 'LEG', name: 'Legal' },
    { id: 'PROC', name: 'Procurement' },
    { id: 'FAC', name: 'Facilities/ESG' },
  ],
  parties: PARTIES,
  objectives: [
    {
      id: 'SOV-2',
      name: 'Legal & Jurisdictional Sovereignty',
      weight: 60,
      questions: [
        {
          id: 'SOV-2.q1',
          grain: 'party',
          axis: 'party',
          text: "Under which jurisdiction's law can the primary provider be compelled to disclose or hand over your data?",
          why: 'If a foreign court can compel disclosure, no amount of encryption restores control — this is the kill-switch on legal sovereignty.',
          role: 'LEG',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'A non-EU jurisdiction (e.g. under the US CLOUD Act) can compel disclosure directly from the provider.', points: 0, seal: 0 },
            { id: 'choice-2', description: 'Only EU/EEA jurisdiction applies; no foreign government can lawfully compel the provider.', points: 50, seal: 2 },
            { id: 'choice-3', description: 'EU jurisdiction applies and the provider is contractually and technically unable to comply with a foreign disclosure order.', points: 100, seal: 4 },
          ],
        },
        {
          id: 'SOV-2.q2',
          grain: 'party',
          axis: 'party',
          text: "Who ultimately owns and controls the primary provider's parent company?",
          why: 'Ownership decides who can be pressured by a foreign state; an EU-operated subsidiary is only as sovereign as its parent allows.',
          role: 'PROC',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'Controlled by a non-EU parent subject to foreign extraterritorial law.', points: 0, seal: 0 },
            { id: 'choice-2', description: 'A non-EU parent exists but an EU entity holds operational control under a trust or ring-fencing arrangement.', points: 25, seal: 1 },
            { id: 'choice-3', description: 'No non-EU parent; ownership and control sit wholly within the EU/EEA.', points: 75, seal: 3 },
          ],
        },
        {
          id: 'SOV-2.q3',
          grain: 'party',
          text: 'If the provider were compelled by a foreign authority to suspend your service, could you keep operating?',
          why: 'Capability-under-stress: sovereignty is what still works when access breaks, not how well the programme runs on a good day.',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'Service would stop; there is no alternative and no exit plan.', points: 0, seal: 0 },
            { id: 'choice-2', description: 'A documented exit plan exists but has never been exercised; recovery would take months.', points: 25, seal: 1 },
            { id: 'choice-3', description: 'Workloads and data are portable to an EU-controlled alternative within days, tested at least once.', points: 50, seal: 2 },
            { id: 'choice-4', description: 'An EU-controlled alternative runs in parallel; a cut-off is survivable with no loss of service.', points: 100, seal: 4 },
          ],
        },
        {
          id: 'SOV-2.q4',
          grain: 'party',
          text: 'Are the physical data-centre facilities (power, cooling, building access) run by an operator you can name and hold to EU jurisdiction?',
          why: 'Facilities sit beneath every other control; a foreign-operated building is a real gap the software layer cannot close — recorded as context, it informs the picture but does not by itself set the floor.',
          role: 'FAC',
          defaultMateriality: 'informational',
          ladder: [
            { id: 'choice-1', description: 'Facilities are run by a non-EU party under non-EU control; the operator is not fully known.', points: 0, seal: 0 },
            { id: 'choice-2', description: 'An EU-based operator runs the facilities under EU jurisdiction, with some dependence on non-EU maintenance or parts.', points: 50, seal: 2 },
            { id: 'choice-3', description: 'Facilities are wholly EU-operated and EU-controlled end to end, including maintenance and physical access.', points: 100, seal: 4 },
          ],
        },
      ],
    },
    {
      id: 'SOV-6',
      name: 'Technology Sovereignty',
      weight: 40,
      questions: [
        {
          id: 'SOV-6.q5',
          grain: 'dimension',
          appliesTo: ['compute', 'storage', 'network', 'iam', 'platform', 'security'],
          text: 'For this technical dimension, who controls the technology, and could you keep operating if a foreign supplier withdrew support?',
          why: 'Capability-under-stress, per dimension: a dimension is only as sovereign as its ability to run without a supplier who can be compelled from outside the EU.',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'Wholly dependent on a foreign-controlled supplier; no EU-controlled alternative exists.', points: 0, seal: 0 },
            { id: 'choice-2', description: 'Foreign-controlled today, but an EU-jurisdiction contract governs the relationship.', points: 25, seal: 1 },
            { id: 'choice-3', description: 'An EU-controlled alternative exists and data stays under EU control, though the supplier is not yet EU-controlled.', points: 50, seal: 2 },
            { id: 'choice-4', description: 'EU-controlled technology; operation continues if the foreign supplier withdraws.', points: 75, seal: 3 },
            { id: 'choice-5', description: 'Fully EU-controlled end to end, including the supply chain beneath this dimension.', points: 100, seal: 4 },
          ],
        },
      ],
    },
  ],
});

describe('authorGauges', () => {
  it('budget', () => {
    expect(authorGauges(sample).budget).toEqual({
      questionCount: 5,
      questionTarget: 40,
      answerUnits: 12,
      estimatedMinutes: 13.5,
      minutesTarget: 90,
    });
  });

  it('coverage', () => {
    const coverage = authorGauges(sample).coverage;
    expect(coverage.objectiveIds).toEqual(['SOV-2', 'SOV-6']);
    expect(coverage.dimensionIds).toEqual([
      'compute',
      'storage',
      'network',
      'iam',
      'platform',
      'security',
      'aiml',
      'edge',
      'facilities',
    ]);
    expect(coverage.cells).toEqual(
      ['compute', 'storage', 'network', 'iam', 'platform', 'security'].map((dimensionId) => ({
        objectiveId: 'SOV-6',
        dimensionId,
        count: 1,
      })),
    );
    expect(coverage.uncoveredDimensions).toEqual(['aiml', 'edge', 'facilities']);
  });

  it('role readout — counts + minutes per role in workbook order, no verdict', () => {
    const readout = authorGauges(sample).roleReadout;
    expect(readout.loads).toEqual([
      { role: 'ARCH', questionCount: 2, estimatedMinutes: 6.5 },
      { role: 'OPS', questionCount: 0, estimatedMinutes: 0 },
      { role: 'SEC', questionCount: 0, estimatedMinutes: 0 },
      { role: 'LEG', questionCount: 1, estimatedMinutes: 2.5 },
      { role: 'PROC', questionCount: 1, estimatedMinutes: 2.5 },
      { role: 'FAC', questionCount: 1, estimatedMinutes: 2 },
    ]);
    expect('missing' in readout).toBe(false);
    expect('overloaded' in readout).toBe(false);
  });

  it('gate list', () => {
    expect(authorGauges(sample).gateList).toEqual([
      { questionId: 'SOV-2.q1', objectiveId: 'SOV-2', role: 'LEG', text: sample.objectives[0].questions[0].text, via: { kind: 'party' } },
      { questionId: 'SOV-2.q2', objectiveId: 'SOV-2', role: 'PROC', text: sample.objectives[0].questions[1].text, via: { kind: 'party' } },
      { questionId: 'SOV-2.q3', objectiveId: 'SOV-2', role: 'ARCH', text: sample.objectives[0].questions[2].text, via: { kind: 'party' } },
      {
        questionId: 'SOV-6.q5',
        objectiveId: 'SOV-6',
        role: 'ARCH',
        text: sample.objectives[1].questions[0].text,
        via: { kind: 'dimension', dimensions: ['compute', 'storage', 'network', 'iam', 'platform', 'security'] },
      },
    ]);
  });

  it('answer units count every appliesTo dimension — no declared filter (all in scope)', () => {
    // SOV-6.q5 fans over all 6 of its appliesTo dims (2+2+1+1+6 = 12), regardless
    // of any authored flag — the declared/undeclared distinction is retired.
    expect(authorGauges(sample).budget.answerUnits).toBe(12);
  });

  it('a dimension question meeting no critical dimension produces no gate entry', () => {
    const nonCritical = WorkbookSchema.parse({
      ...sample,
      objectives: sample.objectives.map((o) =>
        o.id === 'SOV-6'
          ? { ...o, questions: o.questions.map((q) => ({ ...q, appliesTo: ['aiml', 'edge', 'facilities'] })) }
          : o,
      ),
    });
    expect(authorGauges(nonCritical).gateList.some((g) => g.questionId === 'SOV-6.q5')).toBe(false);
  });

  it('a dimension question with no appliesTo costs zero units and zero minutes', () => {
    const empty = DraftWorkbookSchema.parse({
      ...sample,
      objectives: sample.objectives.map((o) => ({
        ...o,
        questions: o.questions.map((q) => (q.grain === 'dimension' ? { ...q, appliesTo: [] } : q)),
      })),
    });
    expect(authorGauges(empty).budget.answerUnits).toBe(6); // 2+2+1+1+0
    expect(authorGauges(empty).budget.estimatedMinutes).toBe(9); // 2.5+2.5+2+2+0
  });

  it('tolerates a draft', () => {
    const gauges = authorGauges(starterWorkbook());
    expect(gauges.budget).toEqual({
      questionCount: 0,
      questionTarget: 40,
      answerUnits: 0,
      estimatedMinutes: 0,
      minutesTarget: 90,
    });
    expect(gauges.coverage.uncoveredDimensions.length).toBe(10);
    expect(gauges.roleReadout.loads.map((l) => l.questionCount)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(gauges.gateList).toEqual([]);
  });
});

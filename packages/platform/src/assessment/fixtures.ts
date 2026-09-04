import { WorkbookSchema } from '../schema';
import type { DimensionQuestion, Party, Workbook } from '../schema';

const ROLES = [
  { id: 'ARCH', name: 'Architecture' },
  { id: 'OPS', name: 'Platform ops' },
  { id: 'SEC', name: 'Security' },
  { id: 'LEG', name: 'Legal' },
  { id: 'PROC', name: 'Procurement' },
  { id: 'FAC', name: 'Facilities/ESG' },
];

const PARTIES = [
  { id: 'institution', name: 'Institution', kind: 'assessed' },
  { id: 'primary-provider', name: 'Primary provider', kind: 'third-party' },
  { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
  { id: 'supplier', name: 'Supplier', kind: 'third-party' },
];

const rungs = (seals: number[]) =>
  seals.map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal }));

export const INST: Party = { id: 'institution', name: 'Our institution', type: 'institution', serves: [] };

export const ASSESSMENT: { kind: 'assessment' } = { kind: 'assessment' };
export const G = { groupId: 'g1', placement: 'individual' as const };

// One party question, no dimensions.
export const BASE = {
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [0, 1, 2, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
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
          ladder: rungs([0, 2, 4]),
        },
      ],
    },
  ],
};

// One dimension question over compute + network; edge is declared but unused.
const DIM_BASE = {
  ...BASE,
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'network', name: 'Network', critical: false },
    { id: 'edge', name: 'Edge', critical: false },
  ],
  objectives: [
    {
      id: 'SOV-6',
      name: 'Tech',
      weight: 100,
      questions: [
        {
          id: 'SOV-6.d1',
          grain: 'dimension',
          appliesTo: ['compute', 'network'],
          text: 'q?',
          why: 'b',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: rungs([0, 2, 4]),
        },
      ],
    },
  ],
};

// The same, with compute split into software + chips.
const STRAT_BASE = {
  ...DIM_BASE,
  dimensions: [
    { id: 'compute', name: 'Compute', strata: ['software', 'chips'], critical: true },
    ...DIM_BASE.dimensions.slice(1),
  ],
};

const dimensionQuestionOf = (workbook: Workbook): DimensionQuestion => {
  const [question] = workbook.objectives[0].questions;
  if (question.grain !== 'dimension') throw new Error('fixture must lead with a dimension question');
  return question;
};

export const BASE_WB = WorkbookSchema.parse(BASE);
export const DIM_WB = WorkbookSchema.parse(DIM_BASE);
export const STRAT_WB = WorkbookSchema.parse(STRAT_BASE);

// `SOV-6.d1` as the strict schema parsed it, from each workbook.
export const dq = dimensionQuestionOf(DIM_WB);
export const sdq = dimensionQuestionOf(STRAT_WB);

// Three questions over three dimensions, for claim scope and walks.
export const CLAIM_WB = WorkbookSchema.parse({
  meta: { id: 'w', version: '1', title: 'W' },
  sealLevels: [0, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: 'd' })),
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
    { id: 'network', name: 'Network', critical: false },
  ],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'O1',
      name: 'Objective One',
      weight: 100,
      questions: [
        { id: 'q1', grain: 'party', text: 'q1?', why: 'w', role: 'LEG', defaultMateriality: 'material', ladder: rungs([0, 2, 4]) },
        { id: 'q2', grain: 'dimension', appliesTo: ['compute', 'storage'], text: 'q2?', why: 'w', role: 'ARCH', defaultMateriality: 'material', ladder: rungs([0, 3, 4]) },
        { id: 'q3', grain: 'dimension', appliesTo: ['network'], text: 'q3?', why: 'w', role: 'SEC', defaultMateriality: 'material', ladder: rungs([0, 4]) },
      ],
    },
  ],
});

// A dimension question beside a party-axis question, for the claim's party axis.
export const PARTY_WB = WorkbookSchema.parse({
  meta: { id: 'wp', version: '1', title: 'WP' },
  sealLevels: [0, 4].map((seal) => ({ seal, name: `S${seal}`, description: 'd' })),
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage' },
  ],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'O',
      name: 'O',
      weight: 100,
      questions: [
        { id: 'qd', grain: 'dimension', appliesTo: ['compute', 'storage'], role: 'SEC', text: 'qd?', why: 'w', defaultMateriality: 'material', ladder: rungs([0, 4]) },
        { id: 'qp', grain: 'party', axis: 'party', role: 'SEC', text: 'qp?', why: 'w', defaultMateriality: 'material', ladder: rungs([0, 4]) },
      ],
    },
  ],
});

export const AWS: Party = { id: 'aws', name: 'AWS', type: 'primary-provider', serves: ['compute'] };
export const OKTA: Party = { id: 'alice:okta', name: 'Okta', type: 'subprocessor', serves: ['compute'] };
export const P3 = [INST, AWS, OKTA];

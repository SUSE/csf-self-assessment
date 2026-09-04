import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import { answerFor, bindingPotential, sliceHygiene } from './index';
import { BASE, G } from './fixtures';

const rungs = (seals: number[]) =>
  seals.map((seal, i) => ({ id: `choice-${i + 1}`, description: 'r', points: seal * 25, seal }));
const question = (id: string, extra: Record<string, unknown>) => ({
  id,
  text: `${id}?`,
  why: 'w',
  role: 'LEG',
  defaultMateriality: 'material',
  ladder: rungs([0, 2, 4]),
  ...extra,
});

// A gating party question, a dimension question over one critical and one not, and an informational twin.
const S5_WB = WorkbookSchema.parse({
  ...BASE,
  meta: { id: 'w5', version: '1', title: 'W5' },
  sealLevels: [0, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: 'd' })),
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
  ],
  objectives: [
    {
      id: 'O1',
      name: 'One',
      weight: 100,
      questions: [
        question('qp', { grain: 'party', axis: 'party' }),
        question('qd', {
          grain: 'dimension',
          appliesTo: ['compute', 'storage'],
          role: 'ARCH',
          ladder: rungs([0, 3, 4]),
        }),
        question('qi', { grain: 'party', axis: 'party', defaultMateriality: 'informational' }),
      ],
    },
  ],
});

const dimension = (id: string) => ({ kind: 'dimension', dimension: id }) as const;
const party = (id: string) => ({ kind: 'party', party: id }) as const;

const ANSWERS = [
  answerFor('qp', party('institution'), { state: 'answered', rungId: 'choice-2', evidence: 'e1' }, G),
  answerFor('qd', dimension('compute'), { state: 'answered', rungId: 'choice-1' }, G),
  answerFor('qd', dimension('storage'), { state: 'answered', rungId: 'choice-2' }, G),
  answerFor('qi', party('institution'), { state: 'answered', rungId: 'choice-3', evidence: 'e2' }, G),
  answerFor('qp', party('subprocessor'), { state: 'dont-know' }, G),
];

describe('bindingPotential (delivery-S5)', () => {
  it('is the gating answers, per-question min, in workbook order', () => {
    expect(bindingPotential(S5_WB, ANSWERS)).toEqual([
      { questionId: 'qp', seal: 2 },
      { questionId: 'qd', seal: 0 },
    ]);
  });

  it('non-critical dimension answers never bind', () => {
    const storage = [answerFor('qd', dimension('storage'), { state: 'answered', rungId: 'choice-2' }, G)];
    expect(bindingPotential(S5_WB, storage)).toEqual([]);
  });

  it('a ranking question never enters the binding potential', () => {
    const ranked = WorkbookSchema.parse({
      ...BASE,
      meta: { id: 'w5r', version: '1', title: 'W5R' },
      sealLevels: [0, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: 'd' })),
      dimensions: [
        { id: 'compute', name: 'Compute', critical: true },
        { id: 'storage', name: 'Storage', critical: false },
      ],
      objectives: [
        {
          id: 'O1',
          name: 'One',
          weight: 100,
          questions: [question('qi', { grain: 'party', axis: 'party', defaultMateriality: 'ranking' })],
        },
      ],
    });
    const answers = [
      answerFor('qi', party('institution'), { state: 'answered', rungId: 'choice-3' }, G),
    ];
    expect(bindingPotential(ranked, answers)).toEqual([]);
  });

  it('a don’t-know on a critical dimension never binds', () => {
    const unknown = [answerFor('qd', dimension('compute'), { state: 'dont-know' }, G)];
    expect(bindingPotential(S5_WB, unknown)).toEqual([]);
  });
});

describe('sliceHygiene', () => {
  it('counts answered / evidenced / don’t-know', () => {
    expect(sliceHygiene(ANSWERS)).toEqual({ answered: 4, evidenced: 2, dontKnow: 1 });
  });

  it('over no answers', () => {
    expect(sliceHygiene([])).toEqual({ answered: 0, evidenced: 0, dontKnow: 0 });
  });
});

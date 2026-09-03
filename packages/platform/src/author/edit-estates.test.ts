import { describe, expect, it } from 'vitest';
import type { TestEstate, Workbook } from '../schema';
import {
  addTestEstate,
  clearEstateAnswer,
  removeTestEstate,
  setEstateAnswer,
  updateTestEstate,
} from './edit-estates';
import { removeDimension, updateDimension } from './edit-dimensions';
import {
  moveRung,
  removeObjective,
  removeQuestion,
  removeRung,
  updateQuestion,
  updateRung,
} from './edit-questions';
import { linkableWorkbook } from './fixtures';

const ESTATE: TestEstate = {
  id: 'profile-base',
  name: 'Profile BASE',
  description: 'EU stack.',
  parties: [
    { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
    { id: 'p', name: 'Provider', type: 'primary-provider', serves: ['compute', 'storage'] },
  ],
  answers: [
    { questionId: 'q-1', rungId: 'choice-1' },
    { questionId: 'q-2', rungId: 'choice-2' },
  ],
};

const FULL_LADDER = [
  { id: 'choice-1', description: 'none', points: 0, seal: 0 as const },
  { id: 'choice-2', description: 'full', points: 100, seal: 4 as const },
];

/** Two questions (a dimension one and a party one) and one seeded estate answering both. */
const wbFixture = (): Workbook => ({
  ...linkableWorkbook(),
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 4, name: 'S4', description: 'd' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'storage', name: 'Storage', critical: false },
    { id: 'edge', name: 'Edge', critical: false },
  ],
  roles: [],
  objectives: [
    {
      id: 'SOV-1',
      name: 'One',
      weight: 100,
      questions: [
        {
          id: 'q-1',
          grain: 'dimension',
          appliesTo: ['compute', 'storage'],
          text: 'T?',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: FULL_LADDER,
        },
        {
          id: 'q-2',
          grain: 'party',
          axis: 'assessment',
          text: 'T2?',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: FULL_LADDER,
        },
      ],
    },
  ],
  testEstates: [structuredClone(ESTATE)],
});

const estateOf = (wb: Workbook, id = 'profile-base') => {
  const estate = wb.testEstates.find((e) => e.id === id);
  if (estate === undefined) throw new Error(`no estate ${id}`);
  return estate;
};

describe('test-estate edit ops (S9b)', () => {
  it('addTestEstate: institution-only party list, no profile', () => {
    const wb = addTestEstate(wbFixture());
    expect(wb.testEstates).toHaveLength(2);
    const added = estateOf(wb, 'estate-1');
    expect(added.name).toBe('New estate');
    expect('profile' in added).toBe(false);
    expect(added.parties).toEqual([{ id: 'inst', name: 'Institution', type: 'institution', serves: [] }]);
    expect(added.answers).toEqual([]);
  });

  it('updateTestEstate patches id/name/description', () => {
    const wb = updateTestEstate(wbFixture(), 'profile-base', { id: 'renamed', name: 'N', description: 'D' });
    const estate = estateOf(wb, 'renamed');
    expect(estate.name).toBe('N');
    expect(estate.description).toBe('D');
    expect(wb.testEstates.some((e) => e.id === 'profile-base')).toBe(false);
  });

  it('removeTestEstate removes it', () => {
    expect(removeTestEstate(wbFixture(), 'profile-base').testEstates).toEqual([]);
  });

  it('setEstateAnswer upserts; clearEstateAnswer removes', () => {
    let wb = addTestEstate(removeTestEstate(wbFixture(), 'profile-base'));
    wb = setEstateAnswer(wb, 'estate-1', 'q-1', 'choice-1');
    wb = setEstateAnswer(wb, 'estate-1', 'q-1', 'choice-2');
    expect(estateOf(wb, 'estate-1').answers).toEqual([
      { questionId: 'q-1', rungId: 'choice-2' },
    ]);
    wb = clearEstateAnswer(wb, 'estate-1', 'q-1');
    expect(estateOf(wb, 'estate-1').answers).toEqual([]);
  });
});

describe('structural edits cascade into the estate answers', () => {
  it('updateQuestion id rename rewrites them; other patches leave them alone', () => {
    expect(estateOf(updateQuestion(wbFixture(), 'q-1', { id: 'q-9' })).answers).toEqual([
      { questionId: 'q-9', rungId: 'choice-1' },
      { questionId: 'q-2', rungId: 'choice-2' },
    ]);
    expect(estateOf(updateQuestion(wbFixture(), 'q-1', { text: 'New text?' })).answers).toEqual(ESTATE.answers);
  });

  it('removeQuestion strips estate answers for it', () => {
    expect(estateOf(removeQuestion(wbFixture(), 'q-1')).answers).toEqual([
      { questionId: 'q-2', rungId: 'choice-2' },
    ]);
  });

  it('removeObjective strips answers for ALL its questions', () => {
    expect(estateOf(removeObjective(wbFixture(), 'SOV-1')).answers).toEqual([]);
  });

  it('removeRung clears only the answers pinned to that rung', () => {
    expect(estateOf(removeRung(wbFixture(), 'q-1', 'choice-1')).answers).toEqual([
      { questionId: 'q-2', rungId: 'choice-2' },
    ]);
    expect(estateOf(removeRung(wbFixture(), 'q-1', 'choice-2')).answers).toEqual(ESTATE.answers);
  });

  it('moveRung and updateRung change no estate answer — a reference is not a position', () => {
    expect(estateOf(moveRung(wbFixture(), 'q-1', 'choice-2', 'earlier')).answers).toEqual(ESTATE.answers);
    expect(estateOf(updateRung(wbFixture(), 'q-1', 'choice-1', { description: 'rewritten' })).answers).toEqual(
      ESTATE.answers,
    );
  });
});

describe('dimension edits cascade into the estate parties', () => {
  it('updateDimension id rename rewrites serves', () => {
    const estate = estateOf(updateDimension(wbFixture(), 'compute', { id: 'cpu' }));
    expect(estate.parties.find((p) => p.id === 'p')?.serves).toEqual(['cpu', 'storage']);
  });

  it('removeDimension strips serves', () => {
    const estate = estateOf(removeDimension(wbFixture(), 'compute'));
    expect(estate.parties.find((p) => p.id === 'p')?.serves).toEqual(['storage']);
  });
});

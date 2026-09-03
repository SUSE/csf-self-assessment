import { describe, expect, it } from 'vitest';
import type { Seal, TestEstate, Workbook } from '../schema';
import { estateAnswers, estateFloorFlips, evaluateTestEstate, testEstateReadings } from './estates';
import type { TestEstateReading } from './estates';

const DIMS = [
  { id: 'compute', name: 'Compute', critical: true },
  { id: 'storage', name: 'Storage', critical: true },
  { id: 'edge', name: 'Edge', critical: false },
];

const SEALS = [
  { seal: 0 as const, name: 'S0', description: 'd' },
  { seal: 1 as const, name: 'S1', description: 'd' },
  { seal: 4 as const, name: 'S4', description: 'd' },
];

const FULL_LADDER = [
  { id: 'choice-1', description: 'none', points: 0, seal: 0 as const },
  { id: 'choice-2', description: 'some rung', points: 25, seal: 1 as const },
  { id: 'choice-3', description: 'strong', points: 75, seal: 3 as const },
  { id: 'choice-4', description: 'full', points: 100, seal: 4 as const },
];

const estateOf = (id: string, overrides: Partial<TestEstate> = {}): TestEstate => ({
  id,
  name: `Estate ${id}`,
  description: 'd',
  parties: [],
  answers: [],
  ...overrides,
});

describe('estateAnswers (S9b)', () => {
  const dimWb: Workbook = {
    meta: { id: 'wb', version: '1.0.0', title: 'T' },
    frontSheet: [],
    sealLevels: SEALS,
    dimensions: DIMS,
    roles: [],
    parties: [],
    objectives: [
      {
        id: 'SOV-1',
        name: 'One',
        weight: 100,
        questions: [
          {
            id: 'q-1',
            grain: 'dimension',
            appliesTo: ['compute', 'storage', 'edge'],
            text: 'T?',
            why: 'w',
            role: 'ARCH',
            defaultMateriality: 'material',
            ladder: FULL_LADDER,
          },
        ],
      },
    ],
    testEstates: [],
    recommendations: [],
  };

  it('expansion: dimension grain fans over the full appliesTo (every dimension in scope)', () => {
    const estate = estateOf('base', { answers: [{ questionId: 'q-1', rungId: 'choice-3' }] });
    const answers = estateAnswers(dimWb, estate);
    expect(answers).toHaveLength(3);
    expect(answers.map((a) => a.target)).toEqual([
      { kind: 'dimension', dimension: 'compute' },
      { kind: 'dimension', dimension: 'storage' },
      { kind: 'dimension', dimension: 'edge' },
    ]);
    for (const a of answers) {
      expect(a.state).toBe('answered');
      if (a.state === 'answered') expect(a.rungId).toBe('choice-3');
      expect(a.gesture).toEqual({ groupId: 'estate:base:q-1', placement: 'group' });
    }
  });

  const partyWb = (axis: 'assessment' | 'party'): Workbook => ({
    meta: { id: 'wb', version: '1.0.0', title: 'T' },
    frontSheet: [],
    roles: [],
    parties: [],
    sealLevels: SEALS,
    dimensions: DIMS,
    objectives: [
      {
        id: 'SOV-1',
        name: 'One',
        weight: 100,
        questions: [
          {
            id: 'q-1',
            grain: 'party',
            axis,
            text: 'T?',
            why: 'w',
            role: 'ARCH',
            defaultMateriality: 'material',
            ladder: FULL_LADDER,
          },
        ],
      },
    ],
    testEstates: [],
    recommendations: [],
  });

  it("expansion: party axis rides the estate's parties", () => {
    const twoParties = estateOf('e', {
      parties: [
        { id: 'inst', name: 'Institution', type: 'institution', serves: [] },
        { id: 'p', name: 'Provider', type: 'primary-provider', serves: [] },
      ],
      answers: [{ questionId: 'q-1', rungId: 'choice-2' }],
    });
    const answers = estateAnswers(partyWb('party'), twoParties);
    expect(answers).toHaveLength(2);
    expect(answers.map((a) => a.target)).toEqual([
      { kind: 'party', party: 'inst' },
      { kind: 'party', party: 'p' },
    ]);

    const partyFree = estateOf('f', { answers: [{ questionId: 'q-1', rungId: 'choice-2' }] });
    expect(estateAnswers(partyWb('party'), partyFree)).toHaveLength(0);
  });

  it('expansion: assessment axis is asked once', () => {
    const estate = estateOf('e', { answers: [{ questionId: 'q-1', rungId: 'choice-2' }] });
    const answers = estateAnswers(partyWb('assessment'), estate);
    expect(answers).toHaveLength(1);
    expect(answers[0].target).toEqual({ kind: 'assessment' });
  });

  it('unanswered questions expand to nothing', () => {
    expect(estateAnswers(dimWb, estateOf('e'))).toEqual([]);
  });
});

describe('testEstateReadings (S9b)', () => {
  const readingWb = (questionIds: string[], testEstates: TestEstate[]): Workbook => ({
    meta: { id: 'wb', version: '1.0.0', title: 'T' },
    frontSheet: [],
    sealLevels: SEALS,
    dimensions: [],
    roles: [],
    parties: [],
    objectives: [
      {
        id: 'SOV-1',
        name: 'One',
        weight: 100,
        questions: questionIds.map((id) => ({
          id,
          grain: 'party' as const,
          axis: 'assessment' as const,
          text: 'T?',
          why: 'w',
          role: 'ARCH' as const,
          defaultMateriality: 'material' as const,
          ladder: FULL_LADDER,
        })),
      },
    ],
    testEstates,
    recommendations: [],
  });

  it('readings: floor and score come from the real engine', () => {
    const wb = readingWb(
      ['q-1'],
      [
        estateOf('zero', { answers: [{ questionId: 'q-1', rungId: 'choice-1' }] }),
        estateOf('one', { answers: [{ questionId: 'q-1', rungId: 'choice-2' }] }),
      ],
    );
    const [zero, one] = testEstateReadings(wb);
    expect(zero.overall.floor).toBe(0);
    expect(zero.overall.score).toBe(0);
    expect(zero.overall.binding).toEqual(['q-1']);
    expect(one.overall.floor).toBe(1);
    expect(one.overall.score).toBe(25);
  });

  it('unanswered material question hits the denominator, never the floor', () => {
    const wb = readingWb(
      ['q-1', 'q-2'],
      [estateOf('one', { answers: [{ questionId: 'q-1', rungId: 'choice-2' }] })],
    );
    const [one] = testEstateReadings(wb);
    expect(one.overall.floor).toBe(1);
    expect(one.overall.score).toBe(12.5);
  });
});

describe('evaluateTestEstate (analytics-S7)', () => {
  const readingWb = (questionIds: string[], testEstates: TestEstate[]): Workbook => ({
    meta: { id: 'wb', version: '1.0.0', title: 'T' },
    frontSheet: [],
    sealLevels: SEALS,
    dimensions: [],
    roles: [],
    parties: [],
    objectives: [
      {
        id: 'SOV-1',
        name: 'One',
        weight: 100,
        questions: questionIds.map((id) => ({
          id,
          grain: 'party' as const,
          axis: 'assessment' as const,
          text: 'T?',
          why: 'w',
          role: 'ARCH' as const,
          defaultMateriality: 'material' as const,
          ladder: FULL_LADDER,
        })),
      },
    ],
    testEstates,
    recommendations: [],
  });

  it("returns the estate's assessment and a full engine result", () => {
    const wb = readingWb(
      ['q-1'],
      [
        estateOf('one', {
          answers: [{ questionId: 'q-1', rungId: 'choice-2' }],
          parties: [{ id: 'inst', name: 'Institution', type: 'institution', serves: [] }],
        }),
      ],
    );
    const evaluation = evaluateTestEstate(wb, wb.testEstates[0]);
    expect(evaluation.estateId).toBe('one');
    expect(evaluation.assessment.parties.map((p) => p.id)).toEqual(['inst']);
    expect(evaluation.assessment.meta.estate).toBe('Estate one');
    expect(evaluation.assessment.answers.length).toBe(evaluation.result.facts.length);
    expect('parties' in evaluation).toBe(false);
    expect(evaluation.result.overall.floor).toBe(1);
    expect(evaluation.result.overall.score).toBe(25);
    expect(evaluation.result.units.total).toBe(
      evaluation.result.facts.length + evaluation.result.units.unanswered,
    );
  });

  it('readings carry unit-grain coverage, never the per-question figure', () => {
    const wb = readingWb(
      ['q-1', 'q-2'],
      [estateOf('one', { answers: [{ questionId: 'q-1', rungId: 'choice-2' }] })],
    );
    const [one] = testEstateReadings(wb);
    expect(one.units).toEqual({ total: 2, answered: 1, dontKnow: 0, na: 0, unanswered: 1 });
    expect(one.overall.score).toBe(12.5);
  });
});

describe('estateFloorFlips (S9b)', () => {
  const reading = (estateId: string, floor: Seal | null): TestEstateReading => ({
    estateId,
    name: `Estate ${estateId}`,
    overall: {
      floor,
      binding: [],
      unknowns: [],
      score: null,
      answered: 0,
      total: 1,
      dontKnowCount: 0,
    },
    units: { total: 1, answered: 0, dontKnow: 0, na: 0, unanswered: 1 },
  });

  it('only floor changes on estates present in both', () => {
    const prev = [reading('a', 1), reading('base', 1)];
    const next = [reading('a', 1), reading('base', 0), reading('m', 2)];
    expect(estateFloorFlips(prev, next)).toEqual([
      { estateId: 'base', name: 'Estate base', from: 1, to: 0 },
    ]);
  });

  it('— → SEAL counts as a flip', () => {
    expect(estateFloorFlips([reading('a', null)], [reading('a', 4)])).toEqual([
      { estateId: 'a', name: 'Estate a', from: null, to: 4 },
    ]);
  });
});

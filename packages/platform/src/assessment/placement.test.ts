import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import {
  answerFor,
  applicableDimensionsOf,
  applicableParties,
  applyPlacement,
  mergeStrata,
  placeGroupParty,
  placeIndividualParty,
  questionOf,
  rungAtPosition,
  rungIn,
  rungOf,
  sealOfAnswer,
  attainablePoints,
  setAnswer,
  splitDimensionsOf,
  strataOf,
  targetKey,
} from './index';
import { BASE, DIM_WB, G, INST, STRAT_WB, dq, sdq } from './fixtures';

const TWO = { state: 'answered', rungId: 'choice-2' } as const;
const ZERO = { state: 'answered', rungId: 'choice-1' } as const;

// The one fixture with a question in each of two objectives.
const TWO_OBJECTIVES = WorkbookSchema.parse({
  ...BASE,
  dimensions: [{ id: 'compute', name: 'Compute', critical: true }],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Tech',
      weight: 50,
      questions: [
        {
          id: 'SOV-1.dq',
          grain: 'dimension',
          appliesTo: ['compute'],
          role: 'ARCH',
          text: 'dq?',
          why: 'w',
          defaultMateriality: 'material',
          ladder: [{ id: 'choice-1', description: 'r0', points: 0, seal: 0 }],
        },
      ],
    },
    { ...BASE.objectives[0], weight: 50, questions: [{ ...BASE.objectives[0].questions[0], id: 'SOV-2.pq' }] },
  ],
});

describe('applicableDimensionsOf', () => {
  it('is the question’s appliesTo, in order — every dimension is in scope now', () => {
    expect(applicableDimensionsOf(dq)).toEqual(['compute', 'network']);
  });
});

describe('strataOf / splitDimensionsOf', () => {
  it('reads a dimension’s declared strata from the workbook ([] when unsplittable)', () => {
    expect(strataOf(STRAT_WB, 'compute')).toEqual(['software', 'chips']);
    expect(strataOf(STRAT_WB, 'network')).toEqual([]);
    expect(strataOf(STRAT_WB, 'nope')).toEqual([]);
  });

  it('derives the split dimensions from stored refinements, first-appearance order', () => {
    const answers = [
      answerFor('SOV-6.d1', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' }, TWO, G),
      answerFor('SOV-6.d1', { kind: 'dimension', dimension: 'network' }, TWO, G),
      answerFor('other.q', { kind: 'dimension-stratum', dimension: 'network', stratum: 'x' }, TWO, G),
    ];
    expect(splitDimensionsOf(answers, 'SOV-6.d1')).toEqual(['compute']);
    expect(splitDimensionsOf(answers, 'unrelated')).toEqual([]);
  });
});

describe('applyPlacement / mergeStrata', () => {
  it('group without splits answers every appliesTo dimension with one shared group id', () => {
    const answers = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: [] }, 'g9');
    const gesture = { groupId: 'g9', placement: 'group' };
    expect(answers).toEqual([
      { questionId: 'SOV-6.d1', target: { kind: 'dimension', dimension: 'compute' }, state: 'answered', rungId: 'choice-2', gesture },
      { questionId: 'SOV-6.d1', target: { kind: 'dimension', dimension: 'network' }, state: 'answered', rungId: 'choice-2', gesture },
    ]);
  });

  it('group over a split dimension fans its strata instead — one claim over the visible chips', () => {
    const answers = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g9');
    expect(answers.map((a) => a.target)).toEqual([
      { kind: 'dimension-stratum', dimension: 'compute', stratum: 'software' },
      { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' },
      { kind: 'dimension', dimension: 'network' },
    ]);
    expect(answers.every((a) => a.gesture.groupId === 'g9' && a.gesture.placement === 'group')).toBe(true);
  });

  it('a split request for a dimension without workbook strata falls back to the whole chip', () => {
    const answers = applyPlacement([], dq, DIM_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g9');
    expect(answers.map((a) => a.target)).toEqual([
      { kind: 'dimension', dimension: 'compute' },
      { kind: 'dimension', dimension: 'network' },
    ]);
  });

  it('placing at stratum level retracts the whole-dimension answer it refines', () => {
    const whole = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: [] }, 'g1');
    const refined = applyPlacement(
      whole,
      sdq,
      STRAT_WB,
      { kind: 'individual-stratum', dimension: 'compute', stratum: 'chips', choice: ZERO },
      'g2',
    );
    expect(refined.map((a) => a.target)).toEqual([
      { kind: 'dimension', dimension: 'network' },
      { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' },
    ]);
    expect(refined[1].gesture).toEqual({ groupId: 'g2', placement: 'individual' });
  });

  it('placing at dimension level retracts the stratum refinements beneath it', () => {
    const split = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g1');
    const merged = applyPlacement(split, sdq, STRAT_WB, { kind: 'individual', dimension: 'compute', choice: ZERO }, 'g2');
    expect(merged.map((a) => a.target)).toEqual([
      { kind: 'dimension', dimension: 'network' },
      { kind: 'dimension', dimension: 'compute' },
    ]);
  });

  it('a group placement fills only the unplaced tray units, leaving resting chips untouched (ADR-0008)', () => {
    const peeled = applyPlacement([], dq, DIM_WB, { kind: 'individual', dimension: 'compute', choice: TWO }, 'g1');
    const grouped = applyPlacement(peeled, dq, DIM_WB, { kind: 'group', choice: ZERO, splitDimensions: [] }, 'g2');
    // A group over a subset still reads as a uniformity claim over its members, so
    // `placement:'group'` on the network answer is what the frozen swept readers see.
    expect(grouped).toEqual([
      {
        questionId: 'SOV-6.d1',
        target: { kind: 'dimension', dimension: 'compute' },
        state: 'answered',
        rungId: 'choice-2',
        gesture: { groupId: 'g1', placement: 'individual' },
      },
      {
        questionId: 'SOV-6.d1',
        target: { kind: 'dimension', dimension: 'network' },
        state: 'answered',
        rungId: 'choice-1',
        gesture: { groupId: 'g2', placement: 'group' },
      },
    ]);
  });

  it('a group placement over an empty tray is a no-op — the footgun is gone', () => {
    const all = applyPlacement([], dq, DIM_WB, { kind: 'group', choice: TWO, splitDimensions: [] }, 'g1');
    expect(applyPlacement(all, dq, DIM_WB, { kind: 'group', choice: ZERO, splitDimensions: [] }, 'g2')).toEqual(all);
  });

  it('a group placement over a split dimension fills only unplaced strata', () => {
    const seeded = applyPlacement(
      [],
      sdq,
      STRAT_WB,
      { kind: 'individual-stratum', dimension: 'compute', stratum: 'software', choice: TWO },
      'g1',
    );
    const grouped = applyPlacement(seeded, sdq, STRAT_WB, { kind: 'group', choice: ZERO, splitDimensions: ['compute'] }, 'g2');
    expect(
      grouped.map((a) => [targetKey(a.target), a.state === 'answered' ? a.rungId : null, a.gesture.placement]),
    ).toEqual([
      ['dimension-stratum:compute:software', 'choice-2', 'individual'],
      ['dimension-stratum:compute:chips', 'choice-1', 'group'],
      ['dimension:network', 'choice-1', 'group'],
    ]);
  });

  it('a group placement attaches ONE evidence note to every answer it fans out — strata included', () => {
    const answers = applyPlacement(
      [],
      sdq,
      STRAT_WB,
      { kind: 'group', choice: { ...TWO, evidence: 'platform contract' }, splitDimensions: ['compute'] },
      'g9',
    );
    expect(answers.map((a) => (a.state === 'answered' ? a.evidence : null))).toEqual([
      'platform contract',
      'platform contract',
      'platform contract',
    ]);
  });

  it('mergeStrata retracts one question-dimension’s refinements and nothing else', () => {
    const split = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g1');
    const other = answerFor('other.q', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' }, TWO, G);
    expect(mergeStrata([...split, other], 'SOV-6.d1', 'compute').map((a) => [a.questionId, targetKey(a.target)])).toEqual(
      [
        ['SOV-6.d1', 'dimension:network'],
        ['other.q', 'dimension-stratum:compute:chips'],
      ],
    );
  });

  it('never mutates the input array', () => {
    const before = applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g1');
    const snapshot = [...before];
    applyPlacement(before, sdq, STRAT_WB, { kind: 'individual', dimension: 'compute', choice: ZERO }, 'g2');
    mergeStrata(before, 'SOV-6.d1', 'compute');
    expect(before).toEqual(snapshot);
  });
});

describe('applicableParties', () => {
  const HYPER = { id: 'hyper', name: 'Hyper', type: 'primary-provider' as const, serves: ['compute'] };

  it('is every party id, in seed order', () => {
    expect(applicableParties([INST, HYPER])).toEqual(['institution', 'hyper']);
  });

  it('is [x, y] for a bare id list', () => {
    expect(
      applicableParties([
        { id: 'x', name: 'X', type: 'primary-provider', serves: [] },
        { id: 'y', name: 'Y', type: 'primary-provider', serves: [] },
      ]),
    ).toEqual(['x', 'y']);
  });
});

describe('placeGroupParty / placeIndividualParty', () => {
  const PARTIES = [INST, { id: 'hyper', name: 'Hyper', type: 'primary-provider' as const, serves: ['compute'] }];

  it('placeGroupParty answers every party with one shared group id, marked group', () => {
    const gesture = { groupId: 'g5', placement: 'group' };
    expect(placeGroupParty([], PARTIES, 'SOV-2.q1', { state: 'answered', rungId: 'choice-2' }, 'g5')).toEqual([
      { questionId: 'SOV-2.q1', target: { kind: 'party', party: 'institution' }, state: 'answered', rungId: 'choice-2', gesture },
      { questionId: 'SOV-2.q1', target: { kind: 'party', party: 'hyper' }, state: 'answered', rungId: 'choice-2', gesture },
    ]);
  });

  it('placeGroupParty fills only the unplaced parties, leaving a resting chip untouched (ADR-0008)', () => {
    const peeled = setAnswer([], placeIndividualParty('SOV-2.q1', 'institution', { state: 'answered', rungId: 'choice-2' }, 'g1'));
    expect(placeGroupParty(peeled, PARTIES, 'SOV-2.q1', { state: 'answered', rungId: 'choice-1' }, 'g2')).toEqual([
      {
        questionId: 'SOV-2.q1',
        target: { kind: 'party', party: 'institution' },
        state: 'answered',
        rungId: 'choice-2',
        gesture: { groupId: 'g1', placement: 'individual' },
      },
      {
        questionId: 'SOV-2.q1',
        target: { kind: 'party', party: 'hyper' },
        state: 'answered',
        rungId: 'choice-1',
        gesture: { groupId: 'g2', placement: 'group' },
      },
    ]);
  });

  it('placeGroupParty over a fully-placed set is a no-op — the footgun is gone', () => {
    const all = placeGroupParty([], PARTIES, 'SOV-2.q1', { state: 'answered', rungId: 'choice-2' }, 'g1');
    expect(placeGroupParty(all, PARTIES, 'SOV-2.q1', { state: 'answered', rungId: 'choice-1' }, 'g2')).toEqual(all);
  });

  it('placeIndividualParty answers one provider, marked individual', () => {
    expect(placeIndividualParty('SOV-2.q1', 'hyper', { state: 'answered', rungId: 'choice-1' }, 'g6')).toEqual({
      questionId: 'SOV-2.q1',
      target: { kind: 'party', party: 'hyper' },
      state: 'answered',
      rungId: 'choice-1',
      gesture: { groupId: 'g6', placement: 'individual' },
    });
  });
});

describe('questionOf', () => {
  it('finds a question in any objective', () => {
    expect(questionOf(TWO_OBJECTIVES, 'SOV-2.pq')?.id).toBe('SOV-2.pq');
    expect(questionOf(TWO_OBJECTIVES, 'SOV-1.dq')?.id).toBe('SOV-1.dq');
    expect(questionOf(TWO_OBJECTIVES, 'nope')).toBeUndefined();
  });
});

describe('the one rung resolver (instrument-S1)', () => {
  const REPEATED_SEAL_WB = WorkbookSchema.parse({
    ...BASE,
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
              { id: 'choice-1', description: 'bottom', points: 0, seal: 4 },
              { id: 'choice-2', description: 'middle', points: 62.5, seal: 4 },
              { id: 'choice-3', description: 'top', points: 125, seal: 4 },
            ],
          },
        ],
      },
    ],
  });
  const q = REPEATED_SEAL_WB.objectives[0].questions[0];

  it('rungIn finds a rung by id, and returns undefined for an id the ladder does not author', () => {
    expect(rungIn(q, 'choice-2')?.points).toBe(62.5);
    expect(rungIn(q, 'choice-9')).toBeUndefined();
  });

  it('rungOf reaches the rung through the workbook', () => {
    expect(rungOf(REPEATED_SEAL_WB, 'SOV-2.q1', 'choice-3')?.points).toBe(125);
    expect(rungOf(REPEATED_SEAL_WB, 'no-such-question', 'choice-1')).toBeUndefined();
  });

  it('sealOfAnswer resolves the SEAL an answered value asserts, and is null otherwise', () => {
    expect(sealOfAnswer(q, { state: 'answered', rungId: 'choice-1' })).toBe(4);
    expect(sealOfAnswer(q, { state: 'dont-know' })).toBeNull();
    expect(sealOfAnswer(q, { state: 'na' })).toBeNull();
    expect(sealOfAnswer(q, { state: 'answered', rungId: 'choice-9' })).toBeNull();
  });

  it('attainablePoints is the ladder maximum, never the top SEAL times 25', () => {
    expect(attainablePoints(q)).toBe(125);
    const singleton = WorkbookSchema.parse({
      ...BASE,
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
              ladder: [{ id: 'choice-1', description: 'only', points: 0, seal: 0 }],
            },
          ],
        },
      ],
    });
    expect(attainablePoints(singleton.objectives[0].questions[0])).toBe(0);
  });
});

describe('rungAtPosition', () => {
  const Q = {
    ladder: [
      { id: 'choice-1', description: 'r0', points: 0, seal: 0 as const },
      { id: 'choice-2', description: 'r2', points: 50, seal: 2 as const },
      { id: 'choice-3', description: 'r4', points: 100, seal: 4 as const },
    ],
  };

  it('resolves a 1-based authored position, and nothing past either end', () => {
    expect(rungAtPosition(Q, 1)?.id).toBe('choice-1');
    expect(rungAtPosition(Q, 3)?.id).toBe('choice-3');
    expect(rungAtPosition(Q, 4)).toBeUndefined();
    expect(rungAtPosition(Q, 0)).toBeUndefined();
    expect(rungAtPosition(Q, -1)).toBeUndefined();
  });

  it('never reads a SEAL, so a flat ladder still resolves three rungs', () => {
    const flat = {
      ladder: Q.ladder.map((rung) => ({ ...rung, seal: 4 as const })),
    };
    expect([1, 2, 3].map((p) => rungAtPosition(flat, p)?.id)).toEqual([
      'choice-1',
      'choice-2',
      'choice-3',
    ]);
  });
});

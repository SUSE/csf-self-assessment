import { describe, expect, it } from 'vitest';
import type { Party, Target } from '../schema';
import { answerFor, questionCoverageDetail, questionUnits } from './index';
import { BASE_WB, DIM_WB, G, INST, dq } from './fixtures';

const compute: Target = { kind: 'dimension', dimension: 'compute' };
const network: Target = { kind: 'dimension', dimension: 'network' };
const TWO = { state: 'answered', rungId: 'choice-2' } as const;

describe('questionUnits — scope from the workbook', () => {
  it('a dimension question fans over every appliesTo dimension, including formerly-undeclared ones', () => {
    const edgeQ = { ...dq, id: 'SOV-6.edge', appliesTo: ['compute', 'edge'] };
    expect(questionUnits(DIM_WB, [], [], edgeQ)).toEqual([
      { kind: 'dimension', dimension: 'compute' },
      { kind: 'dimension', dimension: 'edge' },
    ]);
  });

  it('a party-axis question fans over the parties; an assessment-axis question the single target', () => {
    const partyQ = BASE_WB.objectives[0].questions[0];
    if (partyQ.grain !== 'party') throw new Error('fixture must be a party question');
    const parties: Party[] = [INST, { id: 'hyper', name: 'Hyper', type: 'primary-provider', serves: [] }];
    expect(questionUnits(BASE_WB, parties, [], { ...partyQ, axis: 'party' })).toEqual([
      { kind: 'party', party: 'institution' },
      { kind: 'party', party: 'hyper' },
    ]);
    expect(questionUnits(BASE_WB, parties, [], { ...partyQ, axis: 'assessment' })).toEqual([{ kind: 'assessment' }]);
  });
});

describe('questionCoverageDetail — the navigator tick', () => {
  it('is unanswered with the full unit total when nothing is placed', () => {
    expect(questionCoverageDetail(DIM_WB, [], [], dq)).toEqual({
      status: 'unanswered',
      placed: 0,
      total: 2,
      hasDontKnow: false,
      hasNa: false,
    });
  });

  it('is partial and reports the real fraction when some units are placed', () => {
    const answers = [answerFor('SOV-6.d1', compute, TWO, G)];
    expect(questionCoverageDetail(DIM_WB, [], answers, dq)).toEqual({
      status: 'partial',
      placed: 1,
      total: 2,
      hasDontKnow: false,
      hasNa: false,
    });
  });

  it('is answered once every in-scope unit is dealt with, and surfaces the n/a exclusion', () => {
    const answers = [answerFor('SOV-6.d1', compute, TWO, G), answerFor('SOV-6.d1', network, { state: 'na' }, G)];
    expect(questionCoverageDetail(DIM_WB, [], answers, dq)).toEqual({
      status: 'answered',
      placed: 2,
      total: 2,
      hasDontKnow: false,
      hasNa: true,
    });
  });

  it('flags a don’t-know resolved inside the question (never silent)', () => {
    const answers = [
      answerFor('SOV-6.d1', compute, TWO, G),
      answerFor('SOV-6.d1', network, { state: 'dont-know' }, G),
    ];
    expect(questionCoverageDetail(DIM_WB, [], answers, dq)).toEqual({
      status: 'answered',
      placed: 2,
      total: 2,
      hasDontKnow: true,
      hasNa: false,
    });
  });

  it('is inapplicable with a zero total when no unit is in scope', () => {
    expect(questionCoverageDetail(DIM_WB, [], [], { ...dq, id: 'SOV-6.empty', appliesTo: [] })).toEqual({
      status: 'inapplicable',
      placed: 0,
      total: 0,
      hasDontKnow: false,
      hasNa: false,
    });
  });
});

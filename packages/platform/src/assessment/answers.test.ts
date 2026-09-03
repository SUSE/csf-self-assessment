import { describe, expect, it } from 'vitest';
import {
  answerFor,
  applyPlacement,
  clearQuestion,
  findAnswer,
  nextGroupId,
  retractPlacement,
  setAnswer,
  setAnswers,
  targetKey,
} from './index';
import { ASSESSMENT, DIM_WB, G, STRAT_WB, dq, sdq } from './fixtures';

const TWO = { state: 'answered', rungId: 'choice-2' } as const;

/** Both dimensions of `SOV-6.d1` placed as one group, the usual starting point. */
const grouped = (groupId = 'g1') =>
  applyPlacement([], dq, DIM_WB, { kind: 'group', choice: TWO, splitDimensions: [] }, groupId);

/** The same, with compute fanned over its two strata. */
const groupedSplit = () =>
  applyPlacement([], sdq, STRAT_WB, { kind: 'group', choice: TWO, splitDimensions: ['compute'] }, 'g1');

describe('targetKey', () => {
  it('keys the assessment target', () => {
    expect(targetKey(ASSESSMENT)).toBe('assessment');
  });

  it('keys a dimension target by its dimension', () => {
    expect(targetKey({ kind: 'dimension', dimension: 'network' })).toBe('dimension:network');
  });

  it('keys a dimension-stratum target by dimension and stratum', () => {
    expect(targetKey({ kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' })).toBe(
      'dimension-stratum:compute:chips',
    );
  });

  it('keys a party target by its party id', () => {
    expect(targetKey({ kind: 'party', party: 'idp' })).toBe('party:idp');
  });
});

describe('answerFor', () => {
  it('builds an answered answer with its gesture', () => {
    expect(answerFor('q1', ASSESSMENT, { state: 'answered', rungId: 'choice-3' }, G)).toEqual({
      questionId: 'q1',
      target: ASSESSMENT,
      state: 'answered',
      rungId: 'choice-3',
      gesture: G,
    });
  });

  it('builds a dont-know answer with its gesture', () => {
    expect(answerFor('q1', ASSESSMENT, { state: 'dont-know' }, G)).toEqual({
      questionId: 'q1',
      target: ASSESSMENT,
      state: 'dont-know',
      gesture: G,
    });
  });

  it('builds an n/a answer carrying an optional reason', () => {
    expect(answerFor('q1', ASSESSMENT, { state: 'na', reason: 'no personal data' }, G)).toEqual({
      questionId: 'q1',
      target: ASSESSMENT,
      state: 'na',
      reason: 'no personal data',
      gesture: G,
    });
  });

  it('omits the reason key when absent', () => {
    const a = answerFor('q1', ASSESSMENT, { state: 'na' }, G);
    expect('reason' in a).toBe(false);
    expect(a).toEqual({ questionId: 'q1', target: ASSESSMENT, state: 'na', gesture: G });
  });
});

describe('setAnswer', () => {
  const a1 = answerFor('q1', ASSESSMENT, { state: 'answered', rungId: 'choice-1' }, G);

  it('appends into an empty list', () => {
    const result = setAnswer([], a1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(a1);
  });

  it('replaces the answer for the same (questionId, target)', () => {
    const result = setAnswer([a1], answerFor('q1', ASSESSMENT, { state: 'answered', rungId: 'choice-3' }, G));
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ questionId: 'q1', target: ASSESSMENT, state: 'answered', rungId: 'choice-3', gesture: G });
  });

  it('appends a new (questionId, target)', () => {
    expect(setAnswer([a1], answerFor('q2', ASSESSMENT, { state: 'na' }, G)).length).toBe(2);
  });

  it('never mutates the input array', () => {
    const src = [a1];
    setAnswer(src, answerFor('q1', ASSESSMENT, { state: 'answered', rungId: 'choice-3' }, G));
    expect(src.length).toBe(1);
    expect(src[0]).toBe(a1);
  });
});

describe('setAnswers', () => {
  it('upserts a batch: replaces the same target, appends new ones', () => {
    const network = { kind: 'dimension', dimension: 'network' } as const;
    const replacement = answerFor('SOV-6.d1', network, { state: 'answered', rungId: 'choice-1' }, {
      groupId: 'g2',
      placement: 'individual',
    });
    const after = setAnswers(grouped(), [replacement]);
    expect(after).toHaveLength(2);
    expect(findAnswer(after, 'SOV-6.d1', network)).toEqual(replacement);
  });
});

describe('findAnswer', () => {
  const a1 = answerFor('q1', ASSESSMENT, { state: 'answered', rungId: 'choice-1' }, G);

  it('finds by (questionId, target)', () => {
    expect(findAnswer([a1], 'q1', ASSESSMENT)).toBe(a1);
  });

  it('returns undefined when absent', () => {
    expect(findAnswer([a1], 'zzz', ASSESSMENT)).toBe(undefined);
  });
});

describe('retractPlacement', () => {
  it('removes the exact dimension target, keeps the rest', () => {
    expect(retractPlacement(grouped(), 'SOV-6.d1', { kind: 'dimension', dimension: 'compute' })).toEqual([
      {
        questionId: 'SOV-6.d1',
        target: { kind: 'dimension', dimension: 'network' },
        state: 'answered',
        rungId: 'choice-2',
        gesture: { groupId: 'g1', placement: 'group' },
      },
    ]);
  });

  it('removes only the named stratum, not its siblings', () => {
    const after = retractPlacement(groupedSplit(), 'SOV-6.d1', {
      kind: 'dimension-stratum',
      dimension: 'compute',
      stratum: 'software',
    });
    expect(after.map((a) => targetKey(a.target))).toEqual(['dimension-stratum:compute:chips', 'dimension:network']);
  });

  it('is a no-op when the target is unanswered', () => {
    const answers = grouped();
    expect(retractPlacement(answers, 'SOV-6.d1', { kind: 'dimension', dimension: 'edge' })).toEqual(answers);
  });

  it('never mutates the input array', () => {
    const answers = grouped();
    const snapshot = [...answers];
    retractPlacement(answers, 'SOV-6.d1', { kind: 'dimension', dimension: 'compute' });
    expect(answers).toEqual(snapshot);
  });
});

describe('clearQuestion', () => {
  const other = answerFor('other.q', { kind: 'dimension', dimension: 'compute' }, TWO, G);

  it('drops every answer for the question, all targets, keeping other questions', () => {
    expect(clearQuestion([...grouped(), other], 'SOV-6.d1')).toEqual([other]);
  });

  it('is a no-op when the question holds no answers', () => {
    expect(clearQuestion([other], 'SOV-6.d1')).toEqual([other]);
  });

  it('never mutates the input array', () => {
    const answers = grouped();
    const snapshot = [...answers];
    clearQuestion(answers, 'SOV-6.d1');
    expect(answers).toEqual(snapshot);
  });
});

describe('nextGroupId', () => {
  it('is g1 for an empty assessment', () => {
    expect(nextGroupId([])).toBe('g1');
  });

  it('is one past the highest existing g<n>', () => {
    expect(nextGroupId(grouped('g3'))).toBe('g4');
  });
});

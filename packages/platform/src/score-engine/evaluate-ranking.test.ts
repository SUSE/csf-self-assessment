import { describe, expect, it } from 'vitest';
import { A, MAT2, RANK, RANKONLY, dunno, runOn } from './fixtures';

describe('a ranking question scores but never gates (instrument-S4)', () => {
  it('the demo: the score falls the full 50 points and the floor holds', () => {
    const top = runOn(RANK, [A('q1', 4), A('q2', 4)]);
    expect(top.overall.score).toBe(100);
    expect(top.overall.floor).toBe(4);

    const bottom = runOn(RANK, [A('q1', 4), A('q2', 0)]);
    expect(bottom.overall.score).toBe(50);
    expect(bottom.overall.floor).toBe(4);
  });

  it('the same flip on a material question does move the floor', () => {
    const ranked = runOn(RANK, [A('q1', 4), A('q2', 0)]);
    const material = runOn(MAT2, [A('q1', 4), A('q2', 0)]);
    expect(material.overall.score).toBe(ranked.overall.score);
    expect(material.overall.floor).toBe(0);
    expect(ranked.overall.floor).toBe(4);
  });

  it('an unanswered ranking unit still fills the denominator', () => {
    const result = runOn(RANK, [A('q1', 4)]);
    expect(result.overall.score).toBe(50);
    expect(result.overall.floor).toBe(4);
  });

  it('a ranking dont-know is not a floor hole', () => {
    const result = runOn(RANK, [A('q1', 4), dunno('q2')]);
    expect(result.overall.score).toBe(100);
    expect(result.overall.floor).toBe(4);
    expect(result.overall.unknowns).toEqual([]);
    expect(result.overall.dontKnowCount).toBe(1);
  });

  it('ranking alone still produces a score and no floor', () => {
    const result = runOn(RANKONLY, [A('q1', 2)]);
    expect(result.overall.score).toBe(50);
    expect(result.overall.floor).toBeNull();
  });

  it('ranking never appears in the gating set', () => {
    const result = runOn(RANK, [A('q1', 4), A('q2', 0)]);
    expect(result.gating.map((b) => b.questionId)).toEqual(['q1']);
    expect(result.staircase).toEqual([]);
  });

  it('the fact carries the authored materiality', () => {
    const result = runOn(RANK, [A('q1', 4), A('q2', 0)]);
    expect(result.facts.map((f) => [f.questionId, f.materiality])).toEqual([
      ['q1', 'material'],
      ['q2', 'ranking'],
    ]);
  });
});

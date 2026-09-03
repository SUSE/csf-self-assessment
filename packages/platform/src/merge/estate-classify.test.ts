import { describe, expect, it } from 'vitest';
import { classify, isClash } from './clash-types';
import { reviewLanding, reviewSummary } from './review';
import { ALEX, JANE, emptyBase, landAlex } from './estate-fixture';

describe('the Alex/Jane fixture pair, classified', () => {
  it('the two partials are what the plan measured', () => {
    expect(ALEX.answers).toHaveLength(81);
    expect(ALEX.claims).toHaveLength(4);
    expect(JANE.answers).toHaveLength(61);
    // Four narrowed claims plus a blanket one; without it 33 of her answers
    // would be `out-of-claim`, a state answering cannot produce (delivery §2.3.4).
    expect(JANE.claims).toHaveLength(5);
    for (const partial of [ALEX, JANE]) {
      expect(partial.meta.workbookAssessment).toBe('wa-2026-08-07T16:13:36.472Z');
      expect(partial.meta.workbookId).toBe('csf-estate');
      expect(partial.meta.workbookVersion).toBe('1.0.0');
    }
  });

  it('every one of Alex’s 81 units is sole-source against an empty base', () => {
    const units = classify(emptyBase(), [], ALEX);
    expect(units).toHaveLength(81);
    expect(units.every((u) => u.kind === 'sole-source')).toBe(true);
  });

  it('Jane’s 61 units split 19 agreed / 29 unit-clash / 9 sole-source / 1 grain-clash', () => {
    const alex = landAlex();
    const units = classify(alex.base, alex.ledger, JANE);
    expect(units).toHaveLength(58);
    expect(units.filter((u) => u.kind === 'agreed')).toHaveLength(19);
    expect(units.filter((u) => u.kind === 'sole-source')).toHaveLength(9);
    expect(units.filter((u) => u.kind === 'unit-clash')).toHaveLength(29);
    expect(units.filter((u) => u.kind === 'grain-clash')).toHaveLength(1);
  });

  it('the 30 clashes are 23 divergence, 4 gap, 2 scope, 1 grain', () => {
    const alex = landAlex();
    const clashes = classify(alex.base, alex.ledger, JANE).filter(isClash);
    expect(clashes).toHaveLength(30);
    expect(clashes.filter((c) => c.clash === 'divergence')).toHaveLength(23);
    expect(clashes.filter((c) => c.clash === 'gap')).toHaveLength(4);
    expect(clashes.filter((c) => c.clash === 'scope')).toHaveLength(2);
    expect(clashes.filter((c) => c.clash === 'grain')).toHaveLength(1);
  });

  it('the grain pair is one grain clash', () => {
    const alex = landAlex();
    const janeUnits = classify(alex.base, alex.ledger, JANE);
    const grain = janeUnits.filter((u) => u.kind === 'grain-clash');
    expect(grain).toHaveLength(1);
    const [clash] = grain;
    if (clash.kind !== 'grain-clash') throw new Error('expected a grain clash');
    expect(clash.questionId).toBe('SOV-4.withdrawal-survival');
    expect(clash.dimension).toBe('storage');
    expect(clash.rollUpSide).toBe('base');
    expect(clash.rollUp.from).toBe('Alex');
    expect(clash.rollUp.answer.state === 'answered' ? clash.rollUp.answer.rungId : null).toBe('choice-3');
    const byStratum = new Map(
      clash.strata.map((s) => [s.stratum, s.candidate.answer.state === 'answered' ? s.candidate.answer.rungId : null]),
    );
    expect(byStratum.get('service')).toBe('choice-3');
    expect(byStratum.get('software')).toBe('choice-3');
    expect(byStratum.get('hardware')).toBe('choice-2');
    expect(byStratum.get('chips')).toBe('choice-1');

    expect(
      janeUnits.filter(
        (u) =>
          u.kind === 'sole-source' &&
          u.questionId === 'SOV-4.withdrawal-survival' &&
          u.target.kind === 'dimension-stratum' &&
          u.target.dimension === 'storage',
      ),
    ).toHaveLength(0);
  });

  it('the header still reads the partial’s size', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    expect(reviewSummary(review, [])).toEqual({
      answers: 61,
      newUnits: 9,
      clashes: 30,
      decided: 0,
      collisions: 1,
    });
  });
});

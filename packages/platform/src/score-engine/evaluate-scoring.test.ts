import { describe, expect, it } from 'vitest';
import { A, INFO, MAT2, NAM, SPARSE, WB2, WB3, dunno, na, obj, runOn, wb } from './fixtures';
import { answerFor } from '../assessment';

describe('evaluate() — minimum rule + binding', () => {
  it('objective seal is the minimum over answered material questions; binding names them', () => {
    const r = runOn(MAT2, [A('q1', 3), A('q2', 1)]);
    expect(r.objectives[0].seal).toBe(1);
    expect(r.objectives[0].binding).toEqual(['q2']);
    expect(r.overall.floor).toBe(1);
    expect(r.overall.binding).toEqual(['q2']);
    expect(r.overall.score).toBe(50); // earned 75+25=100 / max 200
    expect(r.overall.answered).toBe(2);
    expect(r.overall.total).toBe(2);
  });

  it('a SEAL-0 material answer floors the objective and names itself (NOT the EC §12.4 bug)', () => {
    const r = runOn(MAT2, [A('q1', 0), A('q2', 4)]);
    expect(r.overall.floor).toBe(0);
    expect(r.overall.binding).toEqual(['q1']);
    expect(r.overall.score).toBe(50); // earned 0+100 / max 200
  });

  it('the overall floor is the minimum across objectives; binding is the objective at the floor', () => {
    const r = runOn(WB2, [A('A.q1', 4), A('B.q1', 0)]);
    expect(r.overall.floor).toBe(0);
    expect(r.overall.binding).toEqual(['B.q1']);
    expect(r.overall.score).toBe(75); // A ratio1×75 + B ratio0×25, covered 100
    expect(r.objectives.find((o) => o.id === 'A')?.score).toBe(100);
    expect(r.objectives.find((o) => o.id === 'B')?.score).toBe(0);
  });
});

describe('evaluate() — answer states differ on the denominator', () => {
  it("don't-know leaves the floor AND the denominator, and is counted as an unknown", () => {
    const r = runOn(MAT2, [A('q1', 4), dunno('q2')]);
    expect(r.overall.floor).toBe(4);
    expect(r.overall.unknowns).toEqual(['q2']);
    expect(r.overall.score).toBe(100); // earned 100 / max 100 — q2 LEFT the denominator
    expect(r.overall.answered).toBe(1);
  });

  it('an unanswered material question STAYS in the denominator at 0 (csf_scoring)', () => {
    const r = runOn(MAT2, [A('q1', 4)]);
    expect(r.overall.floor).toBe(4);
    expect(r.overall.score).toBe(50); // earned 100 / max 200 — contrast the don't-know case
    expect(r.overall.answered).toBe(1);
  });

  it('an N/A answer is excluded from both axes entirely', () => {
    const r = runOn(MAT2, [A('q1', 4), na('q2')]);
    expect(r.overall.floor).toBe(4);
    expect(r.overall.score).toBe(100);
    expect(r.overall.unknowns).toEqual([]);
  });

  it("counts a party don't-know in the grand total", () => {
    const r = runOn(MAT2, [dunno('q1'), A('q2', 3)]);
    expect(r.overall.unknowns).toEqual(['q1']);
    expect(r.overall.dontKnowCount).toBe(1);
  });
});

describe('evaluate() — materiality', () => {
  it('informational answers are recorded but score nothing and never gate (csf_scoring)', () => {
    const zero = runOn(INFO, [A('q1', 4), A('q2', 0)]);
    expect(zero.overall.floor).toBe(4);
    expect(zero.overall.binding).toEqual(['q1']);
    expect(zero.overall.score).toBe(100); // earned 100 / max 100 — q2 excluded
    expect(runOn(INFO, [A('q1', 4), A('q2', 4)]).overall.score).toBe(100);
  });

  it('an n/a-materiality question leaves the denominator even when unanswered', () => {
    const r = runOn(NAM, [A('q1', 4)]);
    expect(r.overall.floor).toBe(4);
    expect(r.overall.score).toBe(100); // 100/100 — NOT 50; contrast material-unanswered
  });
});

describe('evaluate() — sparse ladders', () => {
  it("a ladder's best rung is its attainable maximum", () => {
    const r = runOn(SPARSE, [A('sparse.q1', 3)]);
    expect(r.objectives[0].seal).toBe(3);
    expect(r.objectives[0].score).toBe(100); // earned 75 / max 75 — top rung is full marks
  });
});

describe('evaluate() — renormalisation', () => {
  it('an objective with no material content drops out with its weight', () => {
    const r = runOn(WB3, [A('A.q1', 4)]);
    expect(r.overall.floor).toBe(4);
    expect(r.overall.score).toBe(100); // 1×75 / covered 75 — B's 25 renormalised away
  });

  it('an objective with an unanswered material question is NOT dropped (it counts as 0)', () => {
    const r = runOn(WB2, [A('A.q1', 4)]);
    expect(r.overall.floor).toBe(4); // B has no seal → skipped from the floor
    expect(r.overall.score).toBe(75); // B stays in: 1×75 / covered 100
  });
});

describe('evaluate() — nothing to score', () => {
  it('no answers → null floor and null score', () => {
    const r = runOn(MAT2, []);
    expect(r.overall.floor).toBeNull();
    expect(r.overall.score).toBeNull();
    expect(r.overall.binding).toEqual([]);
    expect(r.overall.answered).toBe(0);
    expect(r.overall.total).toBe(2);
  });

  it("only a don't-know → null floor, null score, but the unknown is counted", () => {
    const r = runOn(MAT2, [dunno('q1')]);
    expect(r.overall.floor).toBeNull();
    expect(r.overall.score).toBeNull();
    expect(r.overall.unknowns).toEqual(['q1']);
  });

  it('only an informational answer → still null floor and null score', () => {
    const r = runOn(INFO, [A('q2', 3)]);
    expect(r.overall.floor).toBeNull();
    expect(r.overall.score).toBeNull();
  });
});

describe('evaluate() — the ladder prices its own rungs (instrument-S1)', () => {
  const AUTHORED = wb([
    obj('O', 100, [
      {
        id: 'q1',
        grain: 'party',
        text: 'q1',
        why: 'why',
        role: 'ARCH',
        defaultMateriality: 'material',
        ladder: [
          { id: 'choice-1', description: 'none', points: 0, seal: 0 },
          { id: 'choice-2', description: 'some', points: 7, seal: 0 },
          { id: 'choice-3', description: 'all', points: 10, seal: 3 },
        ],
      },
    ]),
  ]);
  const at = (rungId: string) =>
    answerFor('q1', { kind: 'assessment' }, { state: 'answered', rungId }, { groupId: 'g1', placement: 'individual' });

  it('scores the rung\'s authored points, not seal × 25', () => {
    const mid = runOn(AUTHORED, [at('choice-2')]);
    expect(mid.overall.score).toBe(70);
    expect(mid.overall.floor).toBe(0);
    const top = runOn(AUTHORED, [at('choice-3')]);
    expect(top.overall.score).toBe(100);
    expect(top.overall.floor).toBe(3);
  });
});

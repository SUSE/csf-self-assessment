import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { dim, dimDunno, dimensionQ, obj, runD, runOn, wb } from './fixtures';

const critWb = (critical: boolean): Workbook =>
  wb([obj('O', 100, [dimensionQ('O.d1', ['compute'])])], [{ id: 'compute', name: 'Compute', critical }]);

describe('evaluate() — dimension grain: critical gating', () => {
  it('score sweeps every dimension; the floor reads only critical ones', () => {
    const r = runD([dim('compute', 2), dim('network', 2), dim('edge', 2)]);
    expect(r.overall.floor).toBe(2);
    expect(r.overall.binding).toEqual(['O.d1']);
    expect(r.overall.score).toBe(50); // earned 3×50=150 / max 3×100=300
    expect(r.objectives[0].seal).toBe(2);
  });

  it('a SEAL-0 on a CRITICAL dimension floors the assessment', () => {
    const r = runD([dim('compute', 2), dim('network', 0), dim('edge', 2)]);
    expect(r.overall.floor).toBe(0);
    expect(r.overall.binding).toEqual(['O.d1']);
  });

  it('a SEAL-0 on a NON-critical dimension moves the score but NOT the floor', () => {
    const r = runD([dim('compute', 2), dim('network', 2), dim('edge', 0)]);
    expect(r.overall.floor).toBe(2);
    expect(r.overall.score).toBeCloseTo(33.3333, 3); // earned 100 / max 300
  });

  it("a don't-know on a critical dimension is an unknown, off both earned and max", () => {
    const r = runD([dimDunno('compute'), dim('network', 2), dim('edge', 2)]);
    expect(r.overall.floor).toBe(2);
    expect(r.overall.unknowns).toEqual(['O.d1']);
    expect(r.overall.score).toBe(50); // earned 50+50=100 / max 200 (compute off both)
  });

  it('progress counts a dimension question complete only when every chip is placed', () => {
    const partial = runD([dim('compute', 2), dim('network', 2)]);
    expect(partial.overall.answered).toBe(0);
    expect(partial.overall.total).toBe(1);
    expect(runD([dim('compute', 2), dim('network', 2), dim('edge', 2)]).overall.answered).toBe(1);
  });
});

describe('evaluate() — firm critical from the workbook (delivery-S2)', () => {
  it('a critical dimension gates the floor', () => {
    expect(runOn(critWb(true), [dim('compute', 0)]).overall.floor).toBe(0);
  });

  it('the same answer on a non-critical dimension never gates (floor null, not 0)', () => {
    expect(runOn(critWb(false), [dim('compute', 0)]).overall.floor).toBeNull();
  });

  it('every authored dimension is in scope — a formerly-undeclared dimension now scores and lists', () => {
    const r = runD([dim('compute', 2), dim('network', 2), dim('edge', 0)]);
    expect(r.overall.score).toBeCloseTo(33.3333, 3); // 100 / 300 — edge counts, no structural n/a
    expect(r.heatmap.some((c) => c.dimension === 'edge')).toBe(true);
    expect(r.declaredDimensions.some((d) => d.id === 'edge')).toBe(true);
  });

  it('the credibility block no longer carries scope events or narrowing flags', () => {
    const r = runD([dim('compute', 2)]);
    expect('scopeEvents' in r.credibility).toBe(false);
    expect('flags' in r.credibility).toBe(false);
  });
});

describe('evaluate() — mini heat map cells', () => {
  it('emits one cell per (objective, dimension) that has an answered material answer', () => {
    const r = runD([dim('compute', 3, 'group'), dim('network', 1, 'individual')]);
    expect(r.heatmap).toEqual([
      { objective: 'O', dimension: 'compute', seal: 3, provenance: 'group', strata: [] },
      { objective: 'O', dimension: 'network', seal: 1, provenance: 'individual', strata: [] },
    ]);
    expect(r.declaredDimensions).toEqual([
      { id: 'compute', name: 'Compute', critical: true },
      { id: 'network', name: 'Network', critical: true },
      { id: 'edge', name: 'Edge', critical: false },
    ]);
  });
});

describe("evaluate() — don't-know grand total, distinct from the floor's gating unknowns (S4)", () => {
  it("counts every in-scope don't-know", () => {
    const r = runD([dim('compute', 2), dimDunno('network'), dimDunno('edge')]);
    expect(r.overall.unknowns).toEqual(['O.d1']); // only the critical network don't-know is a floor hole
    expect(r.overall.dontKnowCount).toBe(2); // network + edge — both admitted, both counted
  });

  it("counts a don't-know on a non-critical dimension but never gates on it", () => {
    const r = runD([dim('compute', 2), dim('network', 2), dimDunno('edge')]);
    expect(r.overall.dontKnowCount).toBe(1);
    expect(r.overall.unknowns).toEqual([]);
  });
});

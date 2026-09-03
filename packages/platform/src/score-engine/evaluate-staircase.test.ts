import { describe, expect, it } from 'vitest';
import { A, MAT2, WB2, dim, dunno, runD, runOn } from './fixtures';

/** A staircase binding with the fields this section does not vary already filled in. */
const binding = (fields: Record<string, unknown>) => ({
  objectiveId: 'O',
  role: 'ARCH',
  dimension: null,
  stratum: null,
  party: null,
  evidence: null,
  ...fields,
});

describe('evaluate() — staircase (binding-constraint climb, spec §4.4.2)', () => {
  it('is empty when nothing gates (no answers, or only a dont-know)', () => {
    expect(runOn(MAT2, []).staircase).toEqual([]);
    expect(runOn(MAT2, [dunno('q1')]).staircase).toEqual([]);
  });

  it('one rung per distinct gating level, ascending, chaining unlocksTo to the next', () => {
    expect(runOn(MAT2, [A('q1', 1), A('q2', 3)]).staircase).toEqual([
      { floor: 1, unlocksTo: 3, binding: [binding({ questionId: 'q1', seal: 1 })] },
      { floor: 3, unlocksTo: null, binding: [binding({ questionId: 'q2', seal: 3 })] },
    ]);
  });

  it('answers at the same level share one rung', () => {
    const r = runOn(MAT2, [A('q1', 0), A('q2', 0)]);
    expect(r.staircase).toHaveLength(1);
    expect(r.staircase[0].floor).toBe(0);
    expect(r.staircase[0].unlocksTo).toBeNull();
    expect(r.staircase[0].binding.map((b) => b.questionId)).toEqual(['q1', 'q2']);
  });

  it('a gating answer already at SEAL-4 is no constraint — no rung', () => {
    const r = runOn(MAT2, [A('q1', 4), A('q2', 4)]);
    expect(r.overall.floor).toBe(4);
    expect(r.staircase).toEqual([]);
  });

  it('a SEAL-4 answer is a valid unlock target but never its own rung', () => {
    expect(runOn(MAT2, [A('q1', 0), A('q2', 4)]).staircase).toEqual([
      { floor: 0, unlocksTo: 4, binding: [binding({ questionId: 'q1', seal: 0 })] },
    ]);
  });

  it('spans objectives; each rung tags its objective', () => {
    expect(runOn(WB2, [A('A.q1', 3), A('B.q1', 1)]).staircase).toEqual([
      { floor: 1, unlocksTo: 3, binding: [binding({ questionId: 'B.q1', objectiveId: 'B', seal: 1 })] },
      { floor: 3, unlocksTo: null, binding: [binding({ questionId: 'A.q1', objectiveId: 'A', seal: 3 })] },
    ]);
  });

  it('dimension gating tags the dimension; a non-critical zero never appears', () => {
    // compute + network critical, edge non-critical → edge@0 is off the floor.
    expect(runD([dim('compute', 0), dim('network', 2), dim('edge', 0)]).staircase).toEqual([
      { floor: 0, unlocksTo: 2, binding: [binding({ questionId: 'O.d1', dimension: 'compute', seal: 0 })] },
      { floor: 2, unlocksTo: null, binding: [binding({ questionId: 'O.d1', dimension: 'network', seal: 2 })] },
    ]);
  });
});

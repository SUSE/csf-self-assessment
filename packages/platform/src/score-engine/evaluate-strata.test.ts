import { describe, expect, it } from 'vitest';
import type { Answer, Seal } from '../schema';
import { answerFor } from '../assessment';
import { G, dimensionQ, obj, runOn, wb } from './fixtures';

// One dimension question over compute / network, full ladders (ladderMax 100 per unit).
// compute splits into software / chips; both dimensions are critical.
const SW = wb([obj('O', 100, [dimensionQ('O.d1', ['compute', 'network'])])], [
  { id: 'compute', name: 'Compute', strata: ['software', 'chips'], critical: true },
  { id: 'network', name: 'Network', critical: true },
]);

// O.d1 authors a FULL ladder, so SEAL n is the (n + 1)th rung.
const strat = (stratum: string, seal: Seal, placement: 'group' | 'individual' = 'group'): Answer =>
  answerFor(
    'O.d1',
    { kind: 'dimension-stratum', dimension: 'compute', stratum },
    { state: 'answered', rungId: `choice-${seal + 1}` },
    { groupId: 'g1', placement },
  );

const stratDunno = (stratum: string): Answer =>
  answerFor('O.d1', { kind: 'dimension-stratum', dimension: 'compute', stratum }, { state: 'dont-know' }, G);

const whole = (dimension: string, seal: Seal): Answer =>
  answerFor(
    'O.d1',
    { kind: 'dimension', dimension },
    { state: 'answered', rungId: `choice-${seal + 1}` },
    { groupId: 'g1', placement: 'group' },
  );

const net = (seal: Seal) => whole('network', seal);
const runS = (answers: Answer[]) => runOn(SW, answers);

describe('evaluate() — strata refinements (S7)', () => {
  it('each answered stratum is a full unit: the score sweeps it, the floor gates it via its critical parent', () => {
    const r = runS([strat('software', 3), strat('chips', 1, 'individual'), net(3)]);
    expect(r.overall.floor).toBe(1); // chips gates through critical compute
    expect(r.overall.binding).toEqual(['O.d1']);
    expect(r.overall.score).toBeCloseTo(58.3333, 3); // (75+25+75) / 300
    expect(r.overall.answered).toBe(1); // both strata + network → the question is complete
    expect(r.overall.total).toBe(1);
  });

  it('a lingering whole-dimension answer is superseded by refinements — ignored on both axes', () => {
    const r = runS([whole('compute', 4), strat('software', 3), strat('chips', 1), net(3)]);
    expect(r.overall.floor).toBe(1);
    expect(r.overall.score).toBeCloseTo(58.3333, 3); // identical above — compute(4) contributes NOTHING
  });

  it('an unanswered stratum stays in the denominator, and the question is incomplete', () => {
    const r = runS([strat('software', 3), net(3)]);
    expect(r.overall.score).toBe(50); // (75+75) / 300 — chips unanswered at 0
    expect(r.overall.answered).toBe(0);
    expect(r.overall.floor).toBe(3); // software + network gate; the unanswered stratum does not
  });

  it("a stratum don't-know on a critical dimension is a floor hole and counts in the grand total", () => {
    const r = runS([strat('software', 3), stratDunno('chips'), net(3)]);
    expect(r.overall.floor).toBe(3);
    expect(r.overall.unknowns).toEqual(['O.d1']);
    expect(r.overall.score).toBe(75); // (75+75) / 200 — the don't-know stratum leaves earned AND max
    expect(r.overall.dontKnowCount).toBe(1);
  });

  it('a formerly-undeclared split dimension now counts — its strata score and gate', () => {
    const r = runS([strat('software', 0), stratDunno('chips'), net(3)]);
    expect(r.overall.floor).toBe(0); // software@0 gates through critical compute
    expect(r.overall.score).toBe(37.5); // (0+75) / 200 — chips don't-know off both
    expect(r.overall.unknowns).toEqual(['O.d1']);
    expect(r.overall.dontKnowCount).toBe(1);
    expect(r.heatmap).toEqual([
      {
        objective: 'O',
        dimension: 'compute',
        seal: 0,
        provenance: 'group',
        strata: [{ stratum: 'software', seal: 0, provenance: 'group' }],
      },
      { objective: 'O', dimension: 'network', seal: 3, provenance: 'group', strata: [] },
    ]);
  });

  it('a stratum name the workbook does not declare never splits the dimension', () => {
    const r = runS([strat('firmware', 0, 'individual'), net(3)]);
    expect(r.overall.floor).toBe(3); // the bogus refinement neither gates nor scores
    expect(r.overall.score).toBe(37.5); // 75 / 200 — compute stays whole and unanswered
    expect(r.heatmap).toEqual([{ objective: 'O', dimension: 'network', seal: 3, provenance: 'group', strata: [] }]);
  });

  it('a split cell carries its minimum, mixed provenance, and the stratum stack in workbook order', () => {
    const r = runS([strat('chips', 1, 'individual'), strat('software', 3), net(3)]);
    expect(r.heatmap).toEqual([
      {
        objective: 'O',
        dimension: 'compute',
        seal: 1,
        provenance: 'mixed',
        strata: [
          { stratum: 'software', seal: 3, provenance: 'group' },
          { stratum: 'chips', seal: 1, provenance: 'individual' },
        ],
      },
      { objective: 'O', dimension: 'network', seal: 3, provenance: 'group', strata: [] },
    ]);
  });

  it('the staircase names the stratum pinning the floor', () => {
    const r = runS([strat('software', 3), strat('chips', 1, 'individual'), net(3)]);
    const bound = (fields: Record<string, unknown>) => ({
      questionId: 'O.d1',
      objectiveId: 'O',
      role: 'ARCH',
      dimension: 'compute',
      stratum: null,
      party: null,
      evidence: null,
      ...fields,
    });
    expect(r.staircase).toEqual([
      { floor: 1, unlocksTo: 3, binding: [bound({ stratum: 'chips', seal: 1 })] },
      {
        floor: 3,
        unlocksTo: null,
        binding: [bound({ stratum: 'software', seal: 3 }), bound({ dimension: 'network', seal: 3 })],
      },
    ]);
  });
});

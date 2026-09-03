import { describe, expect, it } from 'vitest';
import type { LandingChecks } from '../../merge';
import { landingChecksView } from './model';

const CHECKS: LandingChecks = {
  floor: {
    seal: 1,
    unlocksTo: 3,
    binding: [
      { questionId: 'SOV-1.concentration', label: 'whole estate', seal: 1, targetKey: 'assessment' },
      { questionId: 'SOV-4.withdrawal-survival', label: 'Compute · chips', seal: 1, targetKey: 'dimension-stratum:compute:chips' },
      { questionId: 'SOV-5.hardware-provenance', label: 'Compute · chips', seal: 1, targetKey: 'dimension-stratum:compute:chips' },
      { questionId: 'SOV-2.compellability', label: 'Acme Cloud EU', seal: 1, targetKey: 'party:acme-eu' },
    ],
  },
  coverage: { placed: 81, total: 81 },
  dontKnow: 1,
  outOfClaim: 0,
  undecided: 0,
};

describe('landingChecksView', () => {
  it('reads the two gates and nothing else as blocking', () => {
    const clear = landingChecksView(CHECKS, 0);
    expect(clear.gates).toEqual({ undecided: 0, collisions: 0 });
    expect(clear.blocked).toBe(false);

    // outOfClaim and don't-knows are recorded facts; neither may block.
    expect(landingChecksView({ ...CHECKS, outOfClaim: 33, dontKnow: 9 }, 0).blocked).toBe(false);
    expect(landingChecksView({ ...CHECKS, undecided: 2 }, 0).blocked).toBe(true);
    expect(landingChecksView(CHECKS, 1).blocked).toBe(true);
  });

  it('marks the floor and nothing else on the scale', () => {
    const view = landingChecksView(CHECKS, 0);
    expect(view.floor.cells).toEqual([
      { seal: 0, state: 'plain' },
      { seal: 1, state: 'now' },
      { seal: 2, state: 'plain' },
      { seal: 3, state: 'plain' },
      { seal: 4, state: 'plain' },
    ]);
    // Where lifting the bindings would land is carried as a value, not a mark.
    expect(view.floor.unlocksTo).toBe(3);
  });

  it('marks nothing when nothing gates yet', () => {
    const view = landingChecksView(
      { ...CHECKS, floor: { seal: null, unlocksTo: null, binding: [] } },
      0,
    );
    expect(view.floor.cells.every((cell) => cell.state === 'plain')).toBe(true);
    expect(view.pins).toEqual({ answers: 0, questions: 0, targets: 0 });
    expect(view.lanes).toEqual([]);
  });

  it('counts the gating answers and their distinct questions and estate axes', () => {
    // Four bindings, four questions, three axes — Compute · chips carries two.
    expect(landingChecksView(CHECKS, 0).pins).toEqual({ answers: 4, questions: 4, targets: 3 });
  });

  it('counts one question gating several axes once', () => {
    const twice = { questionId: 'SOV-4.withdrawal-survival', seal: 1 as const };
    const view = landingChecksView(
      {
        ...CHECKS,
        floor: {
          seal: 1,
          unlocksTo: 2,
          binding: [
            { ...twice, label: 'Compute', targetKey: 'dimension:compute' },
            { ...twice, label: 'Storage', targetKey: 'dimension:storage' },
          ],
        },
      },
      0,
    );
    expect(view.pins).toEqual({ answers: 2, questions: 1, targets: 2 });
  });

  it('groups bindings by estate axis, worst rung first then busiest', () => {
    const view = landingChecksView(CHECKS, 0);
    expect(view.lanes.map((lane) => [lane.label, lane.questions.length])).toEqual([
      ['Compute · chips', 2],
      ['whole estate', 1],
      ['Acme Cloud EU', 1],
    ]);
    expect(view.lanes[0].questions.map((q) => q.questionId)).toEqual([
      'SOV-4.withdrawal-survival',
      'SOV-5.hardware-provenance',
    ]);
  });

  it('a lane takes the worst rung pinned on it', () => {
    const view = landingChecksView(
      {
        ...CHECKS,
        floor: {
          seal: 0,
          unlocksTo: 2,
          binding: [
            { questionId: 'a', label: 'Compute', seal: 2, targetKey: 'dimension:compute' },
            { questionId: 'b', label: 'Compute', seal: 0, targetKey: 'dimension:compute' },
            { questionId: 'c', label: 'Edge', seal: 1, targetKey: 'dimension:edge' },
          ],
        },
      },
      0,
    );
    expect(view.lanes.map((lane) => [lane.label, lane.worstSeal])).toEqual([
      ['Compute', 0],
      ['Edge', 1],
    ]);
  });
});

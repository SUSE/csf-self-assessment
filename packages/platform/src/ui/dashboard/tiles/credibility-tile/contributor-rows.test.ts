import { describe, expect, it } from 'vitest';
import type { ContributorShare } from '../../../../analytics';
import { contributorRows } from './contributor-rows';

const roster = (n: number): ContributorShare[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `P${i + 1}`,
    units: n - i,
    fraction: (n - i) / ((n * (n + 1)) / 2),
  }));

describe('contributorRows', () => {
  it('names everyone while the roster fits the lines it has', () => {
    expect(contributorRows(roster(5), 5).map((r) => r.label)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(contributorRows(roster(5), 5).every((r) => !r.folded)).toBe(true);
  });

  it('folds the tail into the last line, so the height never moves', () => {
    const rows = contributorRows(roster(20), 5);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.label)).toEqual(['P1', 'P2', 'P3', 'P4', '+16 others']);
    const tail = rows[4]!;
    expect(tail.folded).toBe(true);
    // The tail is a share like any other: it carries what its members carry.
    expect(tail.units).toBe(roster(20).slice(4).reduce((total, s) => total + s.units, 0));
    expect(tail.fraction).toBeCloseTo(roster(20).slice(4).reduce((t, s) => t + s.fraction, 0), 10);
  });

  it('reads an empty ledger as no rows rather than a fold of nothing', () => {
    expect(contributorRows([], 5)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import type { CoverageGauge } from '../../author';
import type { Workbook } from '../../schema';
import { coverageGridModel } from './model';

// The grid model reads objectives and dimensions only to resolve display names, so
// the fixtures build just that shape rather than a full strict workbook.
const workbook = {
  dimensions: [
    { id: 'compute', name: 'Compute' },
    { id: 'edge', name: 'Edge' },
  ],
  objectives: [
    { id: 'SOV-2', name: 'Legal sovereignty' },
    { id: 'SOV-6', name: 'Technology sovereignty' },
  ],
} as Workbook;

const coverage: CoverageGauge = {
  objectiveIds: ['SOV-2', 'SOV-6'],
  dimensionIds: ['compute', 'edge'],
  cells: [
    { objectiveId: 'SOV-6', dimensionId: 'compute', count: 2 },
    { objectiveId: 'SOV-2', dimensionId: 'compute', count: 1 },
  ],
  uncoveredDimensions: ['edge'],
};

describe('coverageGridModel', () => {
  it('is a full rectangle in workbook order — a missing cell is a zero, not a gap', () => {
    const model = coverageGridModel(coverage, workbook);
    expect(model.columns.map((c) => c.dimensionId)).toEqual(['compute', 'edge']);
    expect(model.rows.map((r) => r.objectiveId)).toEqual(['SOV-2', 'SOV-6']);
    expect(model.rows.map((r) => r.cells.map((c) => c.count))).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it('an uncovered dimension is flagged on its column AND on every cell under it', () => {
    const model = coverageGridModel(coverage, workbook);
    expect(model.columns.map((c) => c.uncovered)).toEqual([false, true]);
    expect(model.rows.map((r) => r.cells.map((c) => c.uncovered))).toEqual([
      [false, true],
      [false, true],
    ]);
  });

  it('every cell names its objective and its dimension — a bare digit names neither', () => {
    const model = coverageGridModel(coverage, workbook);
    expect(model.rows[0].cells[0].title).toBe(
      'Legal sovereignty — 1 question reaches Compute',
    );
    expect(model.rows[1].cells[0].title).toBe(
      'Technology sovereignty — 2 questions reach Compute',
    );
    expect(model.rows[0].cells[1].title).toBe(
      'Legal sovereignty — no question reaches Edge',
    );
  });

  it('counts the covered dimensions and states the holes', () => {
    const model = coverageGridModel(coverage, workbook);
    expect([model.covered, model.dimensions]).toEqual([1, 2]);
    expect(model.verdict).toBe('1 of 2 dimensions is reached by no question.');
  });

  it('no hole is its own sentence', () => {
    const model = coverageGridModel({ ...coverage, uncoveredDimensions: [] }, workbook);
    expect(model.covered).toBe(2);
    expect(model.verdict).toBe('Every dimension is reached by at least one question.');
  });

  it('an empty instrument concludes nothing', () => {
    const model = coverageGridModel(
      { objectiveIds: [], dimensionIds: [], cells: [], uncoveredDimensions: [] },
      { dimensions: [], objectives: [] } as unknown as Workbook,
    );
    expect(model.rows).toEqual([]);
    expect(model.verdict).toBeNull();
  });

  it('an id with no authored name falls back to the id', () => {
    const model = coverageGridModel(coverage, {
      dimensions: [],
      objectives: [],
    } as unknown as Workbook);
    expect(model.columns[0].name).toBe('compute');
    expect(model.rows[0].name).toBe('SOV-2');
  });
});

import { describe, expect, it } from 'vitest';
import type { GateEntry } from '../../author';
import type { Workbook } from '../../schema';
import { gateRows } from './model';

// The gate model reads roles and dimensions only to resolve display names, so the
// fixture builds just that shape rather than a full strict workbook.
const workbook = {
  roles: [
    { id: 'LEG', name: 'Legal' },
    { id: 'ARCH', name: 'Architecture' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute' },
    { id: 'iam', name: 'IAM' },
  ],
} as Workbook;

const PARTY_GATE: GateEntry = {
  questionId: 'SOV-2.q1',
  objectiveId: 'SOV-2',
  role: 'LEG',
  text: 'Under which jurisdiction can the provider be compelled?',
  via: { kind: 'party' },
};

const DIMENSION_GATE: GateEntry = {
  questionId: 'SOV-6.q5',
  objectiveId: 'SOV-6',
  role: 'ARCH',
  text: 'Who controls the technology beneath this dimension?',
  via: { kind: 'dimension', dimensions: ['compute', 'iam'] },
};

describe('gateRows', () => {
  it('keeps the gauge order and names the answerer', () => {
    const rows = gateRows([PARTY_GATE, DIMENSION_GATE], workbook);
    expect(rows.map((r) => r.questionId)).toEqual(['SOV-2.q1', 'SOV-6.q5']);
    expect(rows.map((r) => r.roleName)).toEqual(['Legal', 'Architecture']);
    expect(rows[0].roleId).toBe('LEG');
  });

  it('a party gate names no dimension', () => {
    const [row] = gateRows([PARTY_GATE], workbook);
    expect(row.viaKind).toBe('party');
    expect(row.dimensionNames).toEqual([]);
  });

  it('a dimension gate names every critical dimension it gates through', () => {
    const [row] = gateRows([DIMENSION_GATE], workbook);
    expect(row.viaKind).toBe('dimension');
    expect(row.dimensionNames).toEqual(['Compute', 'IAM']);
  });

  it('an id with no authored name falls back to the id — a draft is never blank', () => {
    const [row] = gateRows([DIMENSION_GATE], {
      roles: [],
      dimensions: [],
    } as unknown as Workbook);
    expect(row.roleName).toBe('ARCH');
    expect(row.dimensionNames).toEqual(['compute', 'iam']);
  });

  it('no gates is an empty list, not a row saying so', () => {
    expect(gateRows([], workbook)).toEqual([]);
  });
});

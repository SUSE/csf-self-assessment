import { describe, expect, it } from 'vitest';
import { alexRaw } from '../test-fixtures';
import { AssessmentSchema } from '../schema';
import type { Party } from '../schema';
import { evaluate } from '../score-engine';
import { openUnitsInspection, whatsLeftTile } from './whats-left';

const alex = AssessmentSchema.parse(alexRaw);
const rosterA: Party[] = [...alex.parties, ...(alex.partiesAdded ?? [])];
const rosterB: Party[] = [
  ...rosterA,
  { id: 'northstar-edge', name: 'Northstar Edge Networks', type: 'service-provider', serves: ['edge'] },
];
const A = evaluate(alex.workbook, { ...alex, parties: rosterA });
const B = evaluate(alex.workbook, { ...alex, parties: rosterB });

describe('whatsLeftTile', () => {
  it('says nothing is left when nothing is', () => {
    const tile = whatsLeftTile(A, alex.workbook, rosterA);
    expect(tile.open).toBe(0);
    expect(tile.total).toBe(81);
    expect(tile.groups).toEqual([]);
  });

  it('counts the open units against the whole unit base', () => {
    const tile = whatsLeftTile(B, alex.workbook, rosterB);
    expect(tile.open).toBe(6);
    expect(tile.total).toBe(87);
  });

  it('groups the open units by the subject they sit on', () => {
    const tile = whatsLeftTile(B, alex.workbook, rosterB);
    expect(tile.groups.map((g) => [g.key, g.label, g.units.length])).toEqual([
      ['party:northstar-edge', 'Northstar Edge Networks', 6],
    ]);
  });

  it('names each open unit with its question, role and label', () => {
    const { groups } = whatsLeftTile(B, alex.workbook, rosterB);
    expect(groups[0]!.units.map((u) => [u.questionId, u.roleName, u.label])).toEqual([
      ['SOV-1.decisive-authority', 'Legal', 'Northstar Edge Networks'],
      ['SOV-1.change-of-control', 'Legal', 'Northstar Edge Networks'],
      ['SOV-2.compellability', 'Legal', 'Northstar Edge Networks'],
      ['SOV-2.enforceability', 'Legal', 'Northstar Edge Networks'],
      ['SOV-5.audit-rights', 'Procurement', 'Northstar Edge Networks'],
      ['SOV-7.privileged-access', 'Security', 'Northstar Edge Networks'],
    ]);
    expect(groups[0]!.units[0]!.questionText.startsWith('Where does ultimate decisive authority')).toBe(
      true,
    );
  });

  it('orders groups by size, largest first', () => {
    const seed = B.openUnits[0]!;
    const tile = whatsLeftTile(
      {
        ...B,
        openUnits: [
          { ...seed, target: { kind: 'dimension', dimension: 'storage' } },
          { ...seed, target: { kind: 'party', party: 'acme-cloud' } },
          { ...seed, target: { kind: 'party', party: 'acme-cloud' } },
          { ...seed, target: { kind: 'assessment' } },
        ],
      },
      alex.workbook,
      rosterB,
    );
    expect(tile.groups.map((g) => g.key)).toEqual([
      'party:acme-cloud',
      'dimension:storage',
      'assessment',
    ]);
    expect(tile.groups[2]!.label).toBe('The estate');
  });
});

describe('openUnitsInspection', () => {
  const tile = whatsLeftTile(B, alex.workbook, rosterB);

  it('reads the whole chase when no owner is named', () => {
    const reading = openUnitsInspection(tile, null);
    expect(reading).toEqual({ open: 6, total: 87, groupLabel: null, groups: tile.groups });
  });

  it('reads one owner, counting that owner against the whole base', () => {
    const reading = openUnitsInspection(tile, 'party:northstar-edge');
    expect(reading?.groupLabel).toBe('Northstar Edge Networks');
    expect(reading?.open).toBe(6);
    expect(reading?.total).toBe(87);
    expect(reading?.groups).toHaveLength(1);
  });

  it('resolves to nothing when the owner or the backlog is gone', () => {
    expect(openUnitsInspection(tile, 'party:departed')).toBeNull();
    expect(openUnitsInspection(whatsLeftTile(A, alex.workbook, rosterA), null)).toBeNull();
  });
});

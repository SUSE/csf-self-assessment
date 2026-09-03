import { describe, expect, it } from 'vitest';
import { filterDetail, groupOf, groupRenderings, landingDetail } from './detail-layout';
import { BIG, BIG_LEDGER, ctx } from './detail-fixture';

const detail = landingDetail(BIG, BIG_LEDGER, ctx);
const kept = (query: string): string[] => filterDetail(detail, query).groups.map((group) => group.id);

const refIn = (groupId: string) => {
  const group = detail.groups.find((g) => g.id === groupId);
  if (group === undefined) throw new Error(`no group ${groupId}`);
  return group.panels[0].ref;
};

describe('searching inside one Landing', () => {
  it('a blank query changes nothing', () => {
    expect(filterDetail(detail, '')).toEqual(detail);
    expect(filterDetail(detail, '   ')).toEqual(detail);
  });

  it('matches question id, question text, target label, decision and clash', () => {
    for (const query of ['SOV-2.q1', 'withdraw', 'whole estate', 'Took Jane', 'divergence', 'DIVERGENCE']) {
      expect(filterDetail(detail, query).recordCount).toBe(1);
      expect(kept(query)).toEqual(['SOV-2']);
    }
  });

  it('matches a party name on either side of a party record', () => {
    expect(filterDetail(detail, 'Acme Cloud Europe SAS').recordCount).toBe(1);
    expect(kept('Acme Cloud Europe SAS')).toEqual(['parties']);
    expect(kept('jane:acme-eu')).toEqual(['parties']);
  });

  it('no match empties the model without breaking it', () => {
    const empty = filterDetail(detail, 'zzz');
    expect(empty.groups).toEqual([]);
    expect(empty.recordCount).toBe(0);
    expect(empty.heading).toEqual(detail.heading);
    expect(empty.neighbors).toEqual(detail.neighbors);
  });
});

describe('disclosing inside one Landing', () => {
  it('renderings honour defaults, toggles and the selection', () => {
    expect(groupRenderings(detail.groups, null, {}, false).map((r) => r.open)).toEqual([true, true, true, true, false]);
    expect(groupRenderings(detail.groups, null, { 'agreements:SOV-1': true }, false).map((r) => r.open)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(groupRenderings(detail.groups, null, { parties: false }, false).map((r) => r.open)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    // A selected panel opens its group even when the toggle says closed.
    expect(
      groupRenderings(detail.groups, refIn('agreements:SOV-1'), { 'agreements:SOV-1': false }, false).map((r) => r.open),
    ).toEqual([true, true, true, true, true]);
  });

  it('Expand all is offered only where §4.8 allows', () => {
    expect(groupRenderings(detail.groups, refIn('SOV-2'), {}, false).map((r) => [r.group.id, r.expandAll])).toEqual([
      ['parties', false],
      ['SOV-1', false],
      ['SOV-2', true],
      ['unplaced', false],
      ['agreements:SOV-1', false],
    ]);
    expect(groupRenderings(detail.groups, null, {}, true).every((r) => r.expandAll)).toBe(true);
  });

  it('a ref finds its group', () => {
    expect(groupOf(detail.groups, refIn('agreements:SOV-1'))?.id).toBe('agreements:SOV-1');
    expect(groupOf(detail.groups, { kind: 'party', party: 'nope' })).toBeNull();
  });
});

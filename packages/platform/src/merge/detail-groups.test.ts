import { describe, expect, it } from 'vitest';
import { landingNeighbors } from './detail-context';
import { landingDetail } from './detail-layout';
import { recordRef, recordRefKey } from './record-ref';
import { ABSORB, BIG, BIG_LEDGER, JANE, ctx } from './detail-fixture';

const detail = () => landingDetail(BIG, BIG_LEDGER, ctx);

describe('the whole Landing, grouped the way the navigator reads it', () => {
  it('groups run Parties, then objectives in workbook order, then agreements', () => {
    expect(detail().groups.map((g) => [g.kind, g.id, g.label, g.panels.length])).toEqual([
      ['parties', 'parties', 'Parties', 1],
      ['objective', 'SOV-1', 'Transparency', 1],
      ['objective', 'SOV-2', 'Exit', 1],
      ['objective', 'unplaced', 'Other records', 1],
      ['agreements', 'agreements:SOV-1', 'Transparency · agreements', 1],
    ]);
  });

  it('every record appears exactly once', () => {
    const model = detail();
    expect(model.recordCount).toBe(BIG.records.length);
    const rendered = model.groups.flatMap((group) => group.panels.map((panel) => recordRefKey(panel.ref))).sort();
    expect(rendered).toEqual(BIG.records.map((r) => recordRefKey(recordRef(r))).sort());
  });

  it('agreements are the `agreed` decisions and nothing else', () => {
    const model = detail();
    expect(model.groups.find((g) => g.id === 'agreements:SOV-1')?.panels[0]).toMatchObject({
      kind: 'answer',
      process: 'agreed',
    });
    expect(model.groups.find((g) => g.id === 'SOV-1')?.panels[0]).toMatchObject({
      kind: 'answer',
      process: 'sole-source',
    });
  });

  it('default disclosure follows §4.8', () => {
    for (const group of detail().groups) {
      expect(group.open).toBe(group.kind !== 'agreements');
    }
  });

  it('a party-only Landing has one group', () => {
    const model = landingDetail({ ...JANE, records: [ABSORB] }, BIG_LEDGER, ctx);
    expect(model.groups.map((g) => g.id)).toEqual(['parties']);
    expect(model.recordCount).toBe(1);
  });

  it('the header and neighbours come along', () => {
    const model = detail();
    expect(model.heading.id).toBe(BIG.id);
    expect(model.neighbors).toEqual(landingNeighbors(BIG_LEDGER, BIG.id));
  });
});

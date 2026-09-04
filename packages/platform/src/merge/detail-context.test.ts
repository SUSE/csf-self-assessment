import { describe, expect, it } from 'vitest';
import { landingHeading, landingNeighbors } from './detail-context';
import { ALEX_1, JANE, L1, L2, L3, LEDGER, ctx } from './detail-fixture';

describe('a Landing’s neighbours and its header', () => {
  it('neighbours follow recorded order, not the clock', () => {
    const jane = landingNeighbors(LEDGER, L2);
    expect(jane.previous?.id).toBe(L1);
    expect(jane.next?.id).toBe(L3);
    expect(landingNeighbors(LEDGER, L1).previous).toBeNull();
    expect(landingNeighbors(LEDGER, L3).next).toBeNull();
    expect(landingNeighbors(LEDGER, 'nope')).toEqual({ previous: null, next: null });
    expect(Object.keys(jane.previous ?? {})).not.toContain('records');
    expect(Object.keys(jane.next ?? {})).not.toContain('records');
  });

  it('the header says who landed what, when, against which anchor', () => {
    const heading = landingHeading(JANE, ctx);
    expect(heading).toEqual({
      id: L2,
      shortId: '2222222',
      title: 'Landed Jane’s partial',
      note: 'after the security discussion',
      landedPrefix: 'Jane landed this partial on ',
      landedWhen: '10 August 2026 at 12:32',
      instant: '2026-08-10T12:32:18.422Z',
      anchor: 'Northwind production estate · csf-estate@2',
      unitsReviewed: 1,
      phrases: ['1 standing change', '1 party decision', '1 facilitator-resolved clash'],
    });
    expect(heading.landedPrefix + heading.landedWhen).toBe('Jane landed this partial on 10 August 2026 at 12:32');
  });

  it('no note is null, not an empty string', () => {
    expect(landingHeading(ALEX_1, ctx).note).toBeNull();
  });
});

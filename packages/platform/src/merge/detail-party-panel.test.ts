import { describe, expect, it } from 'vitest';
import { partyPanel } from './detail-party';
import { ABSORB, ADD, RENAME, SPLIT, ctx } from './detail-fixture';

describe('a party decision as two affected sets', () => {
  it('a party row names the id, the name, the type and the served dimensions', () => {
    const panel = partyPanel(ABSORB, ctx);
    expect(panel.before[1]).toEqual({
      id: 'jane:acme-eu',
      name: 'Acme Cloud Europe SAS',
      typeName: 'Cloud provider',
      serves: ['Security'],
    });
    expect(panel.after[0].serves).toEqual(['Compute', 'Security']);
  });

  it('the decision names the participant representation and the survivor', () => {
    expect(partyPanel(ABSORB, ctx).decision).toBe(
      'Absorbed Acme Cloud Europe SAS into Acme Cloud EU as “Acme Cloud Europe SAS”',
    );
    expect(partyPanel(ADD, ctx).decision).toBe('Added Northwind Edge');
    expect(partyPanel(RENAME, ctx).decision).toBe('Renamed Acme Cloud Europe SAS to “Acme Cloud Europe”');
    expect(partyPanel(SPLIT, ctx).decision).toBe('Kept Acme Cloud Europe SAS separate as jane:acme-eu-2');
  });

  it('the label is the party the decision is about', () => {
    expect(partyPanel(ABSORB, ctx).label).toBe('Acme Cloud Europe SAS');
    expect(partyPanel(ADD, ctx).label).toBe('Northwind Edge');
    expect(partyPanel(RENAME, ctx).label).toBe('Acme Cloud Europe');
  });

  it('target rewrites are listed as recorded, never inferred', () => {
    const panel = partyPanel(ABSORB, ctx);
    expect(panel.rewrites).toEqual([
      { questionId: 'SOV-2.q1', before: 'Acme Cloud Europe SAS', after: 'Acme Cloud EU' },
    ]);
    expect(panel.rationale).toBe('Same contracted provider');
    expect(partyPanel({ ...ABSORB, affectedTargets: [] }, ctx).rewrites).toEqual([]);
  });
});

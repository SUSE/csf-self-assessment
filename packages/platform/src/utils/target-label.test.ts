import { describe, expect, it } from 'vitest';
import type { Party } from '../schema';
import { targetLabel } from './target-label';

const WB = {
  dimensions: [
    { id: 'storage', name: 'Storage', strata: ['chips'], critical: false },
    { id: 'security', name: 'Security', critical: false },
  ],
};

const PARTIES: Party[] = [{ id: 'acme', name: 'Acme Cloud EU', type: 't1', serves: [] }];

describe('targetLabel', () => {
  it('reads the whole estate', () => {
    expect(targetLabel(WB, PARTIES, { kind: 'assessment' })).toBe('whole estate');
  });

  it('reads a dimension by name', () => {
    expect(targetLabel(WB, PARTIES, { kind: 'dimension', dimension: 'storage' })).toBe('Storage');
  });

  it('reads a stratum beneath its dimension', () => {
    expect(
      targetLabel(WB, PARTIES, { kind: 'dimension-stratum', dimension: 'storage', stratum: 'chips' }),
    ).toBe('Storage · chips');
  });

  it('reads a party by name', () => {
    expect(targetLabel(WB, PARTIES, { kind: 'party', party: 'acme' })).toBe('Acme Cloud EU');
  });

  it('falls back to the raw id', () => {
    expect(targetLabel(WB, PARTIES, { kind: 'dimension', dimension: 'nope' })).toBe('nope');
  });
});

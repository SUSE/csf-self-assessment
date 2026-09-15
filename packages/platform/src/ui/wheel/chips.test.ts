import { describe, expect, it } from 'vitest';
import { chipAngles, type ChipKind } from './chips';

const chip = (kind: ChipKind, key: string): { kind: ChipKind; key: string } => ({ kind, key });

describe('chipAngles', () => {
  it('puts the assessment chip on the divider and the two axes on opposite arcs', () => {
    const laid = chipAngles([
      chip('dimension', 'compute'),
      chip('dimension', 'platform'),
      chip('dimension', 'edge'),
      chip('party', 'provider'),
      chip('party', 'integrator'),
      chip('assessment', 'assessment'),
    ]);

    expect(laid.find((s) => s.chip.kind === 'assessment')?.deg).toBe(0);
    for (const spoke of laid.filter((s) => s.chip.kind === 'dimension')) {
      expect(spoke.deg).toBeGreaterThan(0);
      expect(spoke.deg).toBeLessThan(180);
    }
    for (const spoke of laid.filter((s) => s.chip.kind === 'party')) {
      expect(spoke.deg).toBeGreaterThan(180);
      expect(spoke.deg).toBeLessThan(360);
    }
  });

  it('spaces each arc evenly and keeps the chips in the order given', () => {
    const laid = chipAngles([chip('dimension', 'a'), chip('dimension', 'b'), chip('dimension', 'c')]);
    expect(laid.map((s) => s.chip.key)).toEqual(['a', 'b', 'c']);
    expect(laid.map((s) => s.deg)).toEqual([45, 90, 135]);
  });

  it('lays out an arc with nothing on it without dividing by zero', () => {
    expect(chipAngles([chip('assessment', 'assessment')])).toEqual([
      { chip: chip('assessment', 'assessment'), deg: 0 },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { shareInkClass } from './seal-color';

describe('shareInkClass', () => {
  it('the open share takes the amber ink, not the amber fill', () => {
    expect(shareInkClass('open')).toBe('text-warning-ink');
  });

  it('the seal, ink and series shares are unchanged', () => {
    expect(shareInkClass('ink')).toBe('text-axis-ink');
    expect(shareInkClass('series')).toBe('text-chart-1');
    expect(shareInkClass(0)).toBe('text-seal-0');
    expect(shareInkClass(4)).toBe('text-seal-4');
  });
});

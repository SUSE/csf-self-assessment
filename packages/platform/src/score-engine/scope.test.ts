import { describe, expect, it } from 'vitest';
import type { SealLevel } from '../schema';
import { MaterialitySchema } from '../schema';
import { gates, minSeal, scores, sealName } from './scope';

const LEVELS: SealLevel[] = [
  { seal: 4, name: 'Verified', description: 'd4' },
  { seal: 0, name: 'Unsealed', description: 'd0' },
  { seal: 2, name: 'Mapped', description: 'd2' },
];

describe('scores / gates (instrument-S4)', () => {
  it('scores material and ranking, nothing else', () => {
    expect(MaterialitySchema.options.filter(scores)).toEqual(['material', 'ranking']);
  });

  it('gates material alone', () => {
    expect(MaterialitySchema.options.filter(gates)).toEqual(['material']);
  });

  it('offers the four values in authoring order', () => {
    expect(MaterialitySchema.options).toEqual(['material', 'ranking', 'informational', 'na']);
  });
});

describe('sealName', () => {
  it('reads the authored name whatever the author order', () => {
    expect(sealName(LEVELS, 2)).toBe('Mapped');
    expect(sealName(LEVELS, 4)).toBe('Verified');
  });

  it('never fabricates a name for a rank the scale skips', () => {
    expect(sealName(LEVELS, 1)).toBe('');
    expect(sealName([], 0)).toBe('');
  });
});

describe('minSeal', () => {
  it('takes the lowest seal', () => {
    expect(minSeal([3])).toBe(3);
    expect(minSeal([4, 1, 3])).toBe(1);
    expect(minSeal([0, 4])).toBe(0);
  });
});

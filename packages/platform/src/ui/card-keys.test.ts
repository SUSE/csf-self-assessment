import { describe, expect, it } from 'vitest';
import { cardKeyFor } from './card-keys';

describe('cardKeyFor', () => {
  it('maps u/U to dont-know', () => {
    expect(cardKeyFor('u')).toEqual({ kind: 'dont-know' });
    expect(cardKeyFor('U')).toEqual({ kind: 'dont-know' });
  });

  it('maps n/N to na', () => {
    expect(cardKeyFor('n')).toEqual({ kind: 'na' });
    expect(cardKeyFor('N')).toEqual({ kind: 'na' });
  });

  it('maps Enter to next', () => {
    expect(cardKeyFor('Enter')).toEqual({ kind: 'next' });
  });

  it('maps 1–9 to place at that rung position', () => {
    expect(cardKeyFor('1')).toEqual({ kind: 'place', position: 1 });
    expect(cardKeyFor('9')).toEqual({ kind: 'place', position: 9 });
  });

  it('returns null for everything else', () => {
    expect(cardKeyFor('0')).toBe(null);
    expect(cardKeyFor('x')).toBe(null);
    expect(cardKeyFor(' ')).toBe(null);
    expect(cardKeyFor('ArrowUp')).toBe(null);
    expect(cardKeyFor('Escape')).toBe(null);
  });
});

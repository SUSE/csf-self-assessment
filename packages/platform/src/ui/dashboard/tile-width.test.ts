import { describe, expect, it } from 'vitest';
import type { TileDef } from '../../analytics';
import { COLUMNS, tileColumns, tileStyle } from './tile-width';

describe('the six-column module', () => {
  it('names every width as the fraction of the row it takes', () => {
    expect(tileColumns('sixth') / COLUMNS).toBe(1 / 6);
    expect(tileColumns('third') / COLUMNS).toBe(1 / 3);
    expect(tileColumns('half') / COLUMNS).toBe(1 / 2);
    expect(tileColumns('twoThirds') / COLUMNS).toBe(2 / 3);
    expect(tileColumns('full') / COLUMNS).toBe(1);
  });

  it('has no width that strands a single column', () => {
    // Five-sixths is absent by construction — the vocabulary IS the type, so
    // there is nothing to reject at runtime.
    const columns = (['sixth', 'third', 'half', 'twoThirds', 'full'] as const).map(tileColumns);
    expect(columns).not.toContain(COLUMNS - 1);
  });

  it('places two equal tiles as equals, which is why the module is six', () => {
    // The relationship a five-column module cannot express: the four heat tiles
    // are one component on four axes, and 2+3 of five would rank them.
    expect(tileColumns('half') * 2).toBe(COLUMNS);
    expect(tileColumns('third') * 3).toBe(COLUMNS);
    expect(tileColumns('twoThirds') + tileColumns('third')).toBe(COLUMNS);
    expect(tileColumns('sixth') * 2 + tileColumns('twoThirds')).toBe(COLUMNS);
  });
});

describe('tileStyle', () => {
  it('carries the declared share and the floor below which the row wraps', () => {
    expect(tileStyle({ width: 'half' })).toBe('--tile-cols:3;--tile-min:21rem;--tile-cross:stretch');
    expect(tileStyle({ width: 'sixth' })).toBe('--tile-cols:1;--tile-min:11rem;--tile-cross:stretch');
  });

  it('lets a body denser than its width raise its own floor', () => {
    // heat-dimension pivots eleven columns at the share heat-stratum uses for
    // five, so the default floor would squash it before the row wrapped.
    expect(tileStyle({ width: 'half', min: 30 })).toBe(
      '--tile-cols:3;--tile-min:30rem;--tile-cross:stretch',
    );
  });

  it('gives a full-width tile no floor — there is nothing wider to wrap onto', () => {
    expect(tileStyle({ width: 'full' })).toBe('--tile-cols:6;--tile-min:0rem;--tile-cross:stretch');
  });

  it('fills the row height unless the body declared that it hugs', () => {
    // The default is what keeps a row hole-free: the shorter tiles take the
    // tallest one's height.
    expect(tileStyle({ width: 'third' })).toContain('--tile-cross:stretch');
    expect(tileStyle({ width: 'third', hug: true })).toContain('--tile-cross:start');
  });

  it('states height as a keyword, never a length', () => {
    // A hugging cell is told to stop stretching; it is never given a height, so
    // what it measures stays a function of the width it actually got. Any `px`
    // here would be a layout decision frozen at one container width.
    for (const style of [
      tileStyle({ width: 'third', hug: true }),
      tileStyle({ width: 'twoThirds' }),
      tileStyle({ width: 'half', min: 26 }),
    ]) {
      expect(style).not.toMatch(/px|height:/);
    }
  });
});

describe('what the module refuses at compile time', () => {
  // The registry cannot be imported here — it pulls in components and this suite
  // runs in node, which is why sections.test.ts hand-builds a fixture too. So
  // the figure/grow contradiction is made unrepresentable in the TYPE
  // (analytics/tiles.ts `FigureTile`) rather than asserted over the registry.
  // That is the stronger check: it fails `pnpm typecheck` on the declaration
  // itself instead of waiting for a suite to walk the list. This case exists to
  // say where the rule lives and to fail if it is ever loosened.
  const FIGURE = {
    id: 'exposure',
    section: 'action',
    title: 'Exposure',
    asks: 'Who holds a kill switch?',
    width: 'twoThirds',
    figure: true,
  } as const satisfies TileDef;

  it('will not let a figure declare that it can use surplus width', () => {
    // @ts-expect-error a figure only scales; growing one spends the width on nothing
    const wrong: TileDef = { ...FIGURE, grow: true };
    expect(wrong.figure).toBe(true);
  });
});

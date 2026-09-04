import { describe, expect, it } from 'vitest';
import { SECTION_ORDER, TILE_IDS, isTileId } from './tiles';

describe('tile vocabulary', () => {
  it('TILE_IDS holds the fifteen tiles in spec order', () => {
    expect(TILE_IDS).toEqual([
      'floor',
      'score',
      'objectives',
      'whats-left',
      'credibility',
      'heat-dimension',
      'heat-stratum',
      'heat-party',
      'heat-role',
      'staircase',
      'exposure',
      'dont-know',
      'evidence',
      'worth-a-second-look',
      'estate-wheel',
    ]);
  });

  it('SECTION_ORDER holds the six sections in reading order', () => {
    expect(SECTION_ORDER).toEqual([
      'standing',
      'provenance',
      'weakness',
      'action',
      'gaps',
      'shape',
    ]);
  });

  it('isTileId accepts a real id and rejects everything else', () => {
    expect(isTileId('objectives')).toBe(true);
    expect(isTileId('floor')).toBe(true);
    // The retired vendor tiles: a restored `__csfView` may still name one.
    expect(isTileId('quick-wins')).toBe(false);
    expect(isTileId('recommender')).toBe(false);
    expect(isTileId('heat-party-type')).toBe(false);
    expect(isTileId('')).toBe(false);
    expect(isTileId(null)).toBe(false);
    expect(isTileId(3)).toBe(false);
    expect(isTileId({ id: 'objectives' })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { TileDef } from '../../analytics';
import { controlSection, focusedTile, tileColumns, tileSections } from './sections';

const def = (d: TileDef): { def: TileDef } => ({ def: d });

const FIXTURE = [
  def({ id: 'floor', section: 'standing', title: 'Floor', asks: 'Where does it floor?', width: 'sixth' }),
  def({
    id: 'objectives',
    section: 'standing',
    title: 'Objectives',
    asks: 'Where is the leverage?',
    width: 'twoThirds',
    figure: true,
    maximises: false,
  }),
  def({
    id: 'heat-dimension',
    section: 'weakness',
    title: 'Heat by dimension',
    asks: 'Which dimension is weakest?',
    width: 'half',
    tints: true,
  }),
  def({
    id: 'estate-wheel',
    section: 'shape',
    title: 'Estate wheel',
    asks: 'Where are we weakest, in one frame?',
    width: 'twoThirds',
    figure: true,
    tints: true,
  }),
];

describe('dashboard sections', () => {
  it('groups the tiles by section, in registry order', () => {
    const groups = tileSections(FIXTURE);
    expect(groups.map((g) => g.section)).toEqual(['standing', 'weakness', 'shape']);
    // No span is computed: each tile carries the share it declared and the row
    // settles the rest (tile-width.ts).
    expect(groups[0]!.tiles.map((t) => t.def.id)).toEqual(['floor', 'objectives']);
  });

  it('drops a section no registered tile belongs to', () => {
    expect(tileSections([FIXTURE[0]!]).map((g) => g.section)).toEqual(['standing']);
  });

  it('reads a stacking tile in the column of the tile before it', () => {
    const stacked = def({
      id: 'credibility',
      section: 'standing',
      title: 'Credibility',
      asks: 'How was this file produced?',
      width: 'twoThirds',
      stack: true,
    });
    expect(tileColumns([FIXTURE[0]!, FIXTURE[1]!, stacked]).map((c) => c.map((t) => t.def.id))).toEqual([
      ['floor'],
      ['objectives', 'credibility'],
    ]);
    // Nothing to stack under: it leads its own column rather than disappearing.
    expect(tileColumns([stacked]).map((c) => c.map((t) => t.def.id))).toEqual([['credibility']]);
  });

  it('puts the tint control on the first section holding a tile that carries the flag', () => {
    expect(controlSection(tileSections(FIXTURE), 'tints')).toBe('weakness');
    expect(controlSection(tileSections([FIXTURE[0]!]), 'tints')).toBe(null);
  });

  it('focuses the named tile, and nothing when none is named', () => {
    expect(focusedTile(FIXTURE, 'heat-dimension')?.def.id).toBe('heat-dimension');
    expect(focusedTile(FIXTURE, null)).toBe(null);
  });

  it('never focuses a tile that declares no maximised reading', () => {
    // The frame renders it no control, so focusing it would strand the reader in
    // a mode with no way back — and `__csfView` can still name it after the
    // declaration changed under a restored session.
    expect(focusedTile(FIXTURE, 'objectives')).toBe(null);
  });
});

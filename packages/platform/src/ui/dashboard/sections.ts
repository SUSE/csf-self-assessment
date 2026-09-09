import {
  SECTION_ORDER,
  tileMaximises,
  type TileDef,
  type TileId,
  type TileSection,
} from '../../analytics';

// What the layout needs from a registered tile: its def. The registry's
// entries carry a component beside it; a test carries the def alone.
export type TileHolder = { def: TileDef };

// One section heading with the tiles under it, in registry order.
//
// There is no placement step: a tile declares its share of the row and the
// wrapping flex row settles the rest (tile-width.ts), so nothing here needs to
// track a running column total or hand a tile a computed span.
export type TileSectionGroup<T extends TileHolder> = {
  section: TileSection;
  tiles: T[];
};

// The one content-driven control a section heading can carry: the provenance
// tint (analytics §4.6). Named by the `TileDef` flag it keys off, never by a
// section name.
export type TileFlag = 'tints';

// The registered tiles grouped by section in `SECTION_ORDER`, sections holding
// none dropped.
export function tileSections<T extends TileHolder>(tiles: readonly T[]): TileSectionGroup<T>[] {
  return SECTION_ORDER.map((section) => ({
    section,
    tiles: tiles.filter((tile) => tile.def.section === section),
  })).filter((group) => group.tiles.length > 0);
}

// The tiles of one row as columns: a tile that declares `stack` is read under
// the tile before it instead of taking a cell of its own. The column is still
// one cell of the wrapping row, sized by the tile that leads it.
export function tileColumns<T extends TileHolder>(tiles: readonly T[]): T[][] {
  const columns: T[][] = [];
  for (const tile of tiles) {
    const open = columns.at(-1);
    if (tile.def.stack === true && open) open.push(tile);
    else columns.push([tile]);
  }
  return columns;
}

// The heading a flag's control belongs on: the first section holding a tile
// that carries the flag, or `null` when no registered tile does.
export function controlSection<T extends TileHolder>(
  groups: readonly TileSectionGroup<T>[],
  flag: TileFlag,
): TileSection | null {
  return groups.find((group) => group.tiles.some((t) => t.def[flag] === true))?.section ?? null;
}

// The maximised tile, or `null`. A tile that declares no maximised reading never
// focuses: the reader gets the grid back rather than a tile stuck in a mode it
// has no control to leave. Maximise lives in the view store, so a restored
// `__csfView` can name a tile that has since stopped maximising.
export function focusedTile<T extends TileHolder>(
  tiles: readonly T[],
  maximised: TileId | null,
): T | null {
  return tiles.find((tile) => tile.def.id === maximised && tileMaximises(tile.def)) ?? null;
}

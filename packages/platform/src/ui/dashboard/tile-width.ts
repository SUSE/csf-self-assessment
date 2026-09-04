import type { TileWidth } from '../../analytics';

// The dashboard is a **six-column module**, laid out as wrapping flex rows.
//
// Six, and not five, because the surface's most common structural relationship
// is *equality* — the four heat tiles are one component on four axes, `floor`
// and `score` are a pair — and a five-column module cannot place two tiles as
// equals: 2+3 is a 1.5:1 ratio that asserts one matters more. Six also gives
// every useful width a name a reader already owns (see `TileWidth`), which five
// cannot.
//
// The count lives here rather than in a class name because nothing in the
// layout is a Tailwind grid utility any more: a tile declares its share and the
// browser computes the row. That is what makes the dashboard respond to its
// *container* — both side panels collapse 18rem → 3rem and change the tiles'
// available width by roughly a third **without the viewport changing at all**,
// so a `lg:` breakpoint is structurally blind to the most common resize on this
// screen.
export const COLUMNS = 6;

// How many of the six columns each named width takes.
const WIDTH_COLUMNS: Readonly<Record<TileWidth, number>> = {
  sixth: 1,
  third: 2,
  half: 3,
  twoThirds: 4,
  full: 6,
};

// The default width floor per named width, in rem: below this the row wraps
// rather than squeezing the tile. A tile whose body is denser than its width
// suggests overrides it (`TileDef.min`) — eleven pivoted columns need more floor
// than five at the same declared share.
//
// `full` has no floor: it is already the whole row, and there is nothing wider
// to wrap onto.
const WIDTH_MIN_REM: Readonly<Record<TileWidth, number>> = {
  sixth: 11,
  third: 15,
  half: 21,
  twoThirds: 28,
  full: 0,
};

// How a cell sizes across the row — the one height decision the module makes.
//
// `stretch` is the default and the reason a row has no holes: a row's height is
// its tallest tile and the rest fill it. `start` is for a body that declared
// `hug` (analytics/tiles.ts) because its height is bounded by what it has to
// say; it ends at its content and the surplus becomes air in the column instead
// of air inside the card. Neither value is a length, so both survive any
// container width — the row is still the only input.
const CROSS = { fill: 'stretch', hug: 'start' } as const;

// What the layout needs from a tile: what it declared about its own content.
export type Sized = { width: TileWidth; min?: number; hug?: boolean };

export function tileColumns(width: TileWidth): number {
  return WIDTH_COLUMNS[width];
}

// The custom properties one tile's cell carries, consumed by `tile-row.svelte`.
//
// Two numbers and a keyword, and the row does the rest: the declared share, the
// floor below which that share stops being legible, and whether the cell fills
// the row's height or ends at its content. There is no placement arithmetic left
// to do — no running column total, no lone-tile special case, no `col-span-*` to
// compute. A row that does not divide evenly is settled by the two flex
// declarations instead: a tile that said it can use surplus width absorbs the
// remainder, and whatever survives becomes equal air on both sides.
//
// Every value here is a ratio, a rem floor or a keyword. No px, and no height
// either: a hugging cell is *told to stop stretching*, never given a length, so
// its height stays whatever its body measures at the width it actually got.
export function tileStyle(tile: Sized): string {
  return (
    `--tile-cols:${tileColumns(tile.width)};` +
    `--tile-min:${tile.min ?? WIDTH_MIN_REM[tile.width]}rem;` +
    `--tile-cross:${tile.hug === true ? CROSS.hug : CROSS.fill}`
  );
}

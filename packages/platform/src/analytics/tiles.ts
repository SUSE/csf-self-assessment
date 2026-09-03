/** The fifteen tiles of the dashboard (analytics §5). A slice registers a subset.
 *
 *  The dashboard is statistics: scoring, answer breakdowns, provenance. Vendor
 *  recommendations left it for their own page (ui/recommendations-page,
 *  specs/recommendations.md §4) — a marketing surface has nothing to gain from a
 *  six-column module and nothing to say about the numbers beside it. */
export type TileId =
  | 'floor'
  | 'score'
  | 'objectives'
  | 'whats-left'
  | 'credibility'
  | 'heat-dimension'
  | 'heat-stratum'
  | 'heat-party'
  | 'heat-role'
  | 'staircase'
  | 'exposure'
  | 'dont-know'
  | 'evidence'
  | 'worth-a-second-look'
  | 'estate-wheel';

export type TileSection =
  | 'standing'
  | 'weakness'
  | 'action'
  | 'gaps'
  | 'shape'
  | 'provenance';

/**
 * How much of a dashboard row a tile's content can spend, named as the fraction
 * of the row it takes. The dashboard is a six-column module, which is the
 * smallest one where every useful width has a name a reader already owns — a
 * five-column module can only offer fifths, and cannot express *equality*, which
 * is this surface's most common relationship (the four heat tiles are one
 * component on four axes; `dont-know` and `evidence` are a pair).
 *
 * Five-sixths is deliberately absent: it strands a single column that nothing
 * fits in.
 */
export type TileWidth = 'sixth' | 'third' | 'half' | 'twoThirds' | 'full';

type TileBase = {
  id: TileId;
  section: TileSection;
  title: string;
  /** The question this tile answers — rendered, not decorative (analytics §2.4). */
  asks: string;
  /** The share of the row this tile's content can spend (ui/dashboard/tile-width.ts). */
  width: TileWidth;
  /** The width in **rem** below which this body stops being legible, when it is
   *  narrower than its declared share implies. It is a measurement of the
   *  content, not a preference: `heat-dimension` pivots eleven columns and needs
   *  more floor than `heat-stratum`'s five at the same declared width. Omitted,
   *  the floor comes from `width` (ui/dashboard/tile-width.ts). */
  min?: number;
  /** Whether this body's height is its own content rather than the row's.
   *
   *  A row's height is its tallest tile and the shorter ones fill it, which is
   *  right when the filling body has more to say at more height — a ledger, a
   *  heat matrix. It is wrong beside a capped figure: `objectives` is capped at
   *  320px of ring but still sets a ~514px row, and `whats-left` measured 98px
   *  empty and 179px populated at that width, so filling spent 335px on air
   *  inside a card. Declaring `hug` ends the card at its content and leaves the
   *  air outside it, in the column, where it reads as space rather than as an
   *  empty panel.
   *
   *  It is a claim about the body, like `width`: only a body whose height is
   *  *bounded by what it has to say* may hug. Anything that grows with the
   *  estate must fill, or it will crop.
   *
   *  This is not a row span — no tile can reach the freed height, exactly as
   *  ui/dashboard/tile-row.svelte refuses. */
  hug?: boolean;
  /** Whether this body has a maximised reading — something it renders that it
   *  cannot render at tile size (analytics §4.3). Default `true`.
   *
   *  Declaring `false` removes the control, and it is the same kind of claim as
   *  `hug`: a body whose grid rendering is already everything it has to say. The
   *  objectives ring labels every wedge with its name, its weight and the seal it
   *  stands at, so the table it used to gain maximised restated the figure.
   *  Maximise is a mode, not a bigger box, so a tile with no second
   *  mode must not offer the control — a button that only enlarges the same body
   *  is a control with nothing under it.
   *
   *  The dashboard reads it twice: the frame renders no control, and a mark
   *  pressed inside such a tile selects without maximising it. */
  maximises?: boolean;
  /** Whether this tile is read in the COLUMN of the tile before it rather than in
   *  a cell of its own — the one way the height a capped figure leaves beside it
   *  is reachable, and still not a row span: the column is one cell, so nothing
   *  reserves height its neighbours cannot see. It must declare the leading
   *  tile's `width`, and the column hugs (both cards end at their content). */
  stack?: boolean;
  /** Whether this tile's marks respond to the provenance tint (analytics §4.6).
   *  The control belongs beside the marks it changes, so the dashboard reads
   *  this to decide where to render it — never a hardcoded section name. */
  tints?: boolean;
};

/**
 * A tile whose body is text that reflows, and so may declare that it can *use*
 * surplus row width — absorbing the remainder of a row that does not divide
 * evenly. A list, a ledger or a heat matrix can; a single headline number
 * cannot. Remainder no tile claims becomes equal air on both sides of the row.
 */
type ReflowingTile = TileBase & { figure?: false; grow?: boolean };

/**
 * A tile whose body is a fixed-aspect drawing. `grow` is `never` rather than
 * merely discouraged: extra width only scales a figure, so growing one enlarges
 * the drawing without spending the width on anything, and the hole it was meant
 * to close reappears inside a bigger box. A row of figures centres its
 * remainder instead.
 */
type FigureTile = TileBase & { figure: true; grow?: never };

export type TileDef = ReflowingTile | FigureTile;

/** Every id, in the order above. */
export const TILE_IDS: readonly TileId[] = [
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
];

/** Section headings in reading order (analytics §4.1). Provenance sits second,
 *  under the standing row: how the file was produced qualifies every number
 *  below it. */
export const SECTION_ORDER: readonly TileSection[] = [
  'standing',
  'provenance',
  'weakness',
  'action',
  'gaps',
  'shape',
];

export const SECTION_TITLE: Readonly<Record<TileSection, string>> = {
  standing: 'Standing',
  weakness: 'Weakness',
  // The climb and the blast radius are one reading: what to fix, and who a fix
  // has to go through.
  action: 'Action & exposure',
  gaps: 'Gaps',
  shape: 'Shape',
  provenance: 'Provenance',
};

/** Whether this tile has a maximised reading, with the default in one place so
 *  no caller spells `!== false` (the frame, the dashboard's mark press and the
 *  focus guard all ask). */
export function tileMaximises(def: TileDef): boolean {
  return def.maximises !== false;
}

/**
 * The view-store guard for a restored `maximised` field: history.state is
 * untrusted input (a sibling app or an older build wrote it — see
 * utils/view-history.ts).
 */
export function isTileId(raw: unknown): raw is TileId {
  return typeof raw === 'string' && TILE_IDS.some((id) => id === raw);
}

import type { Party, Workbook } from '../../schema';
import type { EngineResult } from '../../score-engine';

/**
 * Every tile takes exactly this: the one engine result (invariant #1 — no tile
 * walks `answers`), the instrument, the resolved roster, and whether it is
 * rendering at tile size or maximised (analytics §4.3).
 */
export type TileProps = {
  result: EngineResult;
  workbook: Workbook;
  parties: Party[];
  maximised: boolean;
  /** The mark selected inside THIS tile, in the tile's own encoding, or null.
   *  Owned by the dashboard so it survives the grid ↔ maximised swap
   *  (analytics §4.4.2). */
  selected: string | null;
  /** Select a mark. At grid size the dashboard also maximises this tile. */
  onSelect: (mark: string | null) => void;
  /** The only navigation off the dashboard (analytics §4.4.4). */
  onOpenQuestion: (questionId: string) => void;
  /** The grid-wide provenance tint (analytics §4.6). Describes how an answer was
   *  placed; moves no number, and only the heat tiles and the wheel read it. */
  tint: boolean;
};

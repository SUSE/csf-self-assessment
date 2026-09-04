import type { Seal } from '../schema';
import type { EngineResult } from '../score-engine';

// The base the whole grid is read against (analytics §4.2). Reads the engine
// result alone — the roster is `declaredParties`, the contributors are the
// ledger's.
export type RibbonModel = {
  // Units carrying an answer of any state: total − unanswered.
  unitsPlaced: number;
  unitsTotal: number;
  dontKnow: number;
  parties: number;
  // Distinct participants named by the merge ledger; 0 when nothing has landed.
  contributors: number;
  // The floor, carried for paint only — `overall.floor`, never recomputed. The
  // band's answered part wears it the way the score arc does, so the coverage
  // mark is never read apart from the gate it was taken against. `null` while no
  // gating answer is recorded, and the band stays hue-free.
  floor: Seal | null;
};

export function ribbonModel(result: EngineResult): RibbonModel {
  return {
    unitsPlaced: result.units.total - result.units.unanswered,
    unitsTotal: result.units.total,
    dontKnow: result.units.dontKnow,
    parties: result.declaredParties.length,
    contributors: new Set(result.credibility.ledger.map((landing) => landing.participant)).size,
    floor: result.overall.floor,
  };
}

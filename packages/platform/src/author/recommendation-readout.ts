import type { Workbook } from '../schema';
import { firedLinks } from '../analytics/recommendations';
import { evaluateTestEstate } from './estates';

/** One authored recommendation, named for the readout's rows. */
export type ReadoutRecommendation = { id: string; title: string };

/** One test estate's standing: which of the catalogue its answers would fire. */
export type EstateFiring = {
  estateId: string;
  name: string;
  /** The recommendations that fire on this estate, in catalogue order. */
  fired: ReadoutRecommendation[];
};

/**
 * The dead-ad gauge (docs/specs/recommendations.md §4.5, §5): every authored
 * recommendation run against every test estate through the REAL engine, so an
 * author can see which offer no profile in this workbook would ever hear.
 * Informational like the role readout — it flags nothing and gates nothing.
 */
export type RecommendationReadout =
  | {
      kind: 'readout';
      /** One row per test estate, in workbook order. */
      perEstate: EstateFiring[];
      /** Authored recommendations firing on NO test estate — the dead ads. */
      neverFires: ReadoutRecommendation[];
      /** The whole catalogue, in authored order — the rows' denominator. */
      catalogue: ReadoutRecommendation[];
    }
  | { kind: 'none-authored' }
  | { kind: 'no-estates'; catalogue: ReadoutRecommendation[]; reason: string };

export const NO_ESTATES_REASON =
  'No test estates to measure against — add one under Test estates.';

export function recommendationReadout(workbook: Workbook): RecommendationReadout {
  if (workbook.recommendations.length === 0) return { kind: 'none-authored' };
  const catalogue: ReadoutRecommendation[] = workbook.recommendations.map((r) => ({
    id: r.id,
    title: r.title,
  }));
  if (workbook.testEstates.length === 0) {
    return { kind: 'no-estates', catalogue, reason: NO_ESTATES_REASON };
  }
  const perEstate: EstateFiring[] = workbook.testEstates.map((estate) => {
    const { estateId, name, result } = evaluateTestEstate(workbook, estate);
    const fired = workbook.recommendations
      .filter((r) => firedLinks(r, result.facts, workbook).length > 0)
      .map((r) => ({ id: r.id, title: r.title }));
    return { estateId, name, fired };
  });
  const alive = new Set(perEstate.flatMap((e) => e.fired.map((r) => r.id)));
  return { kind: 'readout', perEstate, neverFires: catalogue.filter((r) => !alive.has(r.id)), catalogue };
}

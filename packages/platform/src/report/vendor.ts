import { recommendationsPage } from '../analytics';
import type { HorizonChapter, RecommenderReading } from '../analytics';
import type { Party, Workbook } from '../schema';
import type { EngineResult } from '../score-engine';

/** The attribution a Report can print: `recommenderReading()` narrowed to its
 *  named arm. A vendor section exists only where the workbook names a
 *  recommender (invariant #5), so an unattributed offer is unrepresentable past
 *  this type rather than guarded against in every component below it. */
export type NamedRecommender = Extract<RecommenderReading, { kind: 'recommender' }>;

/** One horizon chapter, with where its offers sit in the document's one offer
 *  series. The numbering is continuous across chapters — offer 04 is the
 *  strategic chapter's first when the renewal chapter printed three — so it
 *  cannot be derived inside a chapter and is settled here. */
export type ReportVendorChapter = {
  /** The analytics model, unchanged. */
  chapter: HorizonChapter;
  /** How many offers the chapters before this one printed. */
  ordinalFrom: number;
};

/** Spine item 8 (report.md §4.2). Adds nothing to `recommendationsPage()` but
 *  the series offsets — every word of vendor prose is the workbook's. */
export type ReportVendor = {
  recommender: NamedRecommender;
  chapters: ReportVendorChapter[];
};

/** `null` when the workbook names no recommender, or authors no recommendation:
 *  the section is ABSENT, not empty and not explained (§2.2.3, invariant #5). */
export function reportVendor(
  result: EngineResult,
  workbook: Workbook,
  parties: Party[],
): ReportVendor | null {
  const page = recommendationsPage(result, workbook, parties);
  if (page.recommender.kind !== 'recommender') return null;
  if (workbook.recommendations.length === 0) return null;

  let ordinalFrom = 0;
  const chapters = page.chapters.map((chapter) => {
    const entry: ReportVendorChapter = { chapter, ordinalFrom };
    if (chapter.band.kind === 'cards') ordinalFrom += chapter.band.cards.length;
    return entry;
  });

  return { recommender: page.recommender, chapters };
}

import type { ReportVendor } from './vendor';

/** Which offers answer which reading, by the reading's own id. A reading names
 *  questions; an offer's TRIGGER covers questions (`RecommendationCard.questions`,
 *  specs/recommendations.md §4.3); where the two meet, the finding can point at
 *  the offer without the offer moving into the finding.
 *
 *  Values are the offer ORDINALS the vendor chapter prints — the reader's handle
 *  on the page, and the only number the pointer carries. */
export type OfferPointers = Readonly<Record<string, number[]>>;

/** question id → the ordinals of every offer whose trigger covers it. */
function ordinalsByQuestion(vendor: ReportVendor | null): Map<string, number[]> {
  const byQuestion = new Map<string, number[]>();
  if (vendor === null) return byQuestion;
  for (const { chapter, ordinalFrom } of vendor.chapters) {
    if (chapter.band.kind !== 'cards') continue;
    chapter.band.cards.forEach((card, index) => {
      const ordinal = ordinalFrom + index + 1;
      for (const question of card.questions) {
        const seen = byQuestion.get(question.questionId) ?? [];
        if (!seen.includes(ordinal)) seen.push(ordinal);
        byQuestion.set(question.questionId, seen);
      }
    });
  }
  return byQuestion;
}

/** The pointers for one document: reading id → offer ordinals, ascending. A
 *  reading with no offer behind it is absent rather than empty. */
export function offerPointers(
  vendor: ReportVendor | null,
  questionsByReading: Readonly<Record<string, string[]>>,
): OfferPointers {
  const byQuestion = ordinalsByQuestion(vendor);
  const pointers: Record<string, number[]> = {};
  for (const [readingId, questionIds] of Object.entries(questionsByReading)) {
    const ordinals = [...new Set(questionIds.flatMap((id) => byQuestion.get(id) ?? []))].sort(
      (a, b) => a - b,
    );
    if (ordinals.length > 0) pointers[readingId] = ordinals;
  }
  return pointers;
}

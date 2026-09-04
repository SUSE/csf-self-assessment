import type { Landing, LandingEnvelope, Party, WorkbookAssessment } from '../schema';
import type { Viewer } from './history';
import { landingCountPhrases, landingDate, landingTime, longDateOf } from './history';
import { landingSummary, shortLandingId } from './ledger';

// Reading ONE Landing as its semantic before and after (landing-history §4.4-§4.8):
// the header sentence, the affected records grouped the way the navigator reads
// them, and each record as two labelled peer snapshots with the human action
// between. Pure — the viewer's calendar arrives as an argument.

// This module is the Landing's frame: its recorded-order neighbours, the context
// every panel builder reads, and the sticky heading.

// Recorded-order neighbours (§2.5.3, invariant #11): array position, never time.
// `previous` is the earlier Landing, `next` the later one. Both null when the id
// names none.
export type LandingNeighbors = { previous: LandingEnvelope | null; next: LandingEnvelope | null };

const envelopeOf = (landing: Landing | undefined): LandingEnvelope | null => {
  if (landing === undefined) return null;
  const { records: _records, ...envelope } = landing;
  return envelope;
};

export function landingNeighbors(ledger: readonly Landing[], id: string): LandingNeighbors {
  const at = ledger.findIndex((landing) => landing.id === id);
  if (at === -1) return { previous: null, next: null };
  return { previous: envelopeOf(ledger[at - 1]), next: envelopeOf(ledger[at + 1]) };
}

// Everything the detail needs beyond the Landing: the anchor (its workbook names
// objectives, questions, SEAL levels and party types; its meta names the
// workbook-assessment), the estate roster that names party targets, and the viewer's
// calendar ( — the core reads no clock).
export type DetailContext = {
  workbookAssessment: WorkbookAssessment;
  parties: readonly Party[];
  viewer: Viewer;
};

// The sticky detail header (§4.4). `note` and every count are derived.
export type LandingHeading = {
  id: string;
  shortId: string;
  title: string;
  note: string | null;
  // `Jane landed this partial on ` — everything the sentence says before the
  // instant, trailing space included.
  landedPrefix: string;
  // `10 August 2026 at 14:32` — the viewer-local instant, the `<time>` text.
  landedWhen: string;
  // The raw ISO instant: the `datetime` attribute AND the tooltip (§2.5.2).
  instant: string;
  anchor: string;
  unitsReviewed: number;
  phrases: string[];
};

export function landingHeading(landing: Landing, ctx: DetailContext): LandingHeading {
  const summary = landingSummary(landing);
  const meta = ctx.workbookAssessment.meta;
  const day = longDateOf(landingDate(landing, ctx.viewer), ctx.viewer);
  return {
    id: landing.id,
    shortId: shortLandingId(landing.id),
    title: `Landed ${landing.participant}’s partial`,
    note: landing.note ?? null,
    landedPrefix: `${landing.participant} landed this partial on `,
    landedWhen: `${day} at ${landingTime(landing, ctx.viewer)}`,
    instant: landing.at,
    anchor: `${meta.estate} · ${meta.workbookId}@${meta.workbookVersion}`,
    unitsReviewed: summary.unitsReviewed,
    phrases: landingCountPhrases(summary),
  };
}

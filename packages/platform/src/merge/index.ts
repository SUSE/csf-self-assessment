import type { Assessment, Target, WorkbookAssessment } from '../schema';
import { targetLabel } from '../utils/target-label';

// The facilitator's merge, as pure functions: the version gate per
// partial, the review of one partial against the estate base, and the landing
// that commits it. Nothing prevented, everything remembered: every landed unit
// leaves a ledger record; the version gate is the ONLY hard refusal, and only
// because a mismatched file answers a different question.

export type PartialCheck = { ok: true } | { ok: false; reason: string };

// Refusal rules (merge.md,), first failure wins: only the
// workbook-assessment lineage and the workbook id@version must match. The same
// participant may land again — a re-landing appends to the ledger.
export function checkPartial(wa: WorkbookAssessment, candidate: Assessment): PartialCheck {
  if (candidate.meta.participant === undefined) {
    return { ok: false, reason: 'not a partial: a finalized assessment carries no participant identity' };
  }
  if (candidate.meta.workbookAssessment !== wa.meta.id) {
    return {
      ok: false,
      reason: `from a different workbook-assessment (${candidate.meta.workbookAssessment}, expected ${wa.meta.id})`,
    };
  }
  if (
    candidate.meta.workbookId !== wa.meta.workbookId ||
    candidate.meta.workbookVersion !== wa.meta.workbookVersion
  ) {
    return {
      ok: false,
      reason: `filled against ${candidate.meta.workbookId}@${candidate.meta.workbookVersion}, expected ${wa.meta.workbookId}@${wa.meta.workbookVersion}`,
    };
  }
  return { ok: true };
}

// Human-readable target for the clash queue and the lens, resolved against the
// workbook-assessment's workbook (dimension names) and parties (party names);
// unknown ids fall back to the raw id.
export function describeTarget(target: Target, wa: WorkbookAssessment): string {
  return targetLabel(wa.workbook, wa.parties, target);
}

export { authorityLabel, authorityOf, candidateProvenance } from './authority';
export type { CandidateProvenance } from './authority';

export {
  NO_HISTORY_FILTERS,
  NO_HISTORY_VIEW,
  OUTCOME_FILTERS,
  calendarDateOf,
  dateGroupHeading,
  historyGroups,
  historyScreen,
  isHistoryView,
  isNarrowed,
  landingById,
  landingCountPhrases,
  landingDate,
  landingForSearch,
  landingMatches,
  landingParticipants,
  landingTime,
  longDateOf,
  sameHistoryView,
  searchTerms,
} from './history';
export type {
  CalendarDate,
  DateFilter,
  HistoryContext,
  HistoryFilters,
  HistoryGroup,
  HistoryScreen,
  HistoryView,
  OutcomeFilter,
  Viewer,
} from './history';

export {
  RecordRefSchema,
  partySubject,
  recordRef,
  recordRefKey,
  sameRecordRef,
} from './record-ref';
export type { RecordRef } from './record-ref';

export { landingHeading, landingNeighbors } from './detail-context';
export type { DetailContext, LandingHeading, LandingNeighbors } from './detail-context';
export { UNPLACED_OBJECTIVE, answerPanel, snapshotReading } from './detail-answer';
export type { AnswerPanel, CandidateReading, SnapshotReading } from './detail-answer';
export { partyPanel } from './detail-party';
export type { PartyPanel, PartyReading, TargetRewriteReading } from './detail-party';
export {
  PANEL_RESERVE_PX,
  filterDetail,
  groupMountings,
  groupOf,
  groupRenderings,
  landingDetail,
  panelOf,
} from './detail-layout';
export type {
  DetailGroup,
  DetailPanel,
  GroupMounting,
  GroupRendering,
  LandingDetail,
} from './detail-layout';

export { landingChecks } from './checks';
export type { FloorBinding, FloorPreview, LandingChecks } from './checks';

export {
  choiceSentence,
  claimPhrase,
  disputedRecords,
  disputedSentences,
  effectOf,
  landingSummary,
  ledgerEntries,
  ledgerSummary,
  ledgerUnits,
  questionBlame,
  recordSentence,
  shortLandingId,
  standingAuthors,
  standingCandidate,
  standingUnits,
  unitHistory,
} from './ledger';
export type {
  BlameUnit,
  LandingEffect,
  LandingSummary,
  LedgerEntry,
  LedgerSummary,
  LedgerUnit,
  StandingAuthor,
  StandingUnit,
  UnitHistoryEntry,
} from './ledger';

export { sameStanding, snapshotOf } from './snapshot';

export { choiceKey, optionsFor, reanswerCells, upsertResolution } from './choices';
export type { ClashOption, ReanswerCell } from './choices';

export { suggest, suggestedChoice } from './suggest';
export type { Suggestion, SuggestionBasis, SuggestedChoice } from './suggest';

export { classify, clashCandidates, isClash } from './clash-types';
export type {
  AgreedUnit,
  GrainClash,
  GrainStratum,
  LandingClash,
  LandingUnit,
  ReviewCandidate,
  SoleSourceUnit,
  UnitClash,
} from './clash-types';
export { canLand, reviewLanding, reviewSummary } from './review';
export type { LandingReview, PartyEffect, ReviewSummary } from './review';
export { resolveClash } from './resolve';
export type { ClashUnitOutcome } from './resolve';

export {
  NAME_STOPWORDS,
  absorb,
  nameTokens,
  pairSides,
  pairTitle,
  partyChoiceKey,
  partyOptionsFor,
  servesLabels,
  splitIdFor,
  suggestPartyPairs,
  upsertPartyDecision,
} from './parties';
export type {
  Absorption,
  AliasPair,
  IdCollisionPair,
  PartyOption,
  PartyPair,
  PartySide,
  ServesDiff,
} from './parties';

export {
  NO_FILTER,
  canMoveFloor,
  filterClashes,
  filterSummary,
  isDecided,
  isNonScoring,
  isOneRungApart,
  isQueueNarrowed,
  optionName,
  participantsOf,
  queueFacets,
  queueGroups,
  toggleSwitch,
} from './queue';
export type {
  ClashClassFilter,
  ClashStatusFilter,
  QueueFacets,
  QueueFilter,
  QueueGroup,
  QueueOption,
  QueueSwitch,
} from './queue';

export { applyOutcomes, finalizeLanded, land, landingOutcomes, landingRefusalMessage } from './land';
export type { LandingDecisions, LandingOutcome, LandingRefusal, LandingStamp, UnitOutcome } from './land';

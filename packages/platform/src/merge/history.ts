import { z } from 'zod';
import type { Landing, LandingEnvelope, Party, Workbook } from '../schema';
import { questionOf } from '../assessment';
import { targetLabel } from '../utils/target-label';
import type { LandingSummary } from './ledger';
import { landingSummary, shortLandingId } from './ledger';
import type { RecordRef } from './record-ref';
import { RecordRefSchema, sameRecordRef } from './record-ref';

// Reading the merge ledger as a searchable chronology (landing-history §3.3): the
// viewer's calendar, the filters a History reading applies, and the date groups
// the list renders. Pure — the viewer's locale and zone arrive as an argument,
// never read from the environment here.

// A calendar date in the viewer's zone, `YYYY-MM-DD` — the form the date-range
// controls edit and date groups are keyed by. Never an instant.
export type CalendarDate = string;

// The viewer's calendar, stamped by the app shell: the pure core reads neither
// clock nor environment.
export type Viewer = { locale: string; zone: string };

export const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// The date filter. The `range` variant IS the expanded control — an open
// end is unbounded — so no separate "filters expanded" flag exists.
export const DateFilterSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all-time') }),
  z.object({
    kind: z.literal('range'),
    from: CalendarDateSchema.nullable(),
    to: CalendarDateSchema.nullable(),
  }),
]);

// Which derived count the outcome filter requires to be non-zero (§4.3).
export const OutcomeFilterSchema = z.enum([
  'all',
  'new',
  'changed',
  'cleared',
  'agreements',
  'resolved',
  'parties',
]);

export const HistoryFiltersSchema = z.object({
  search: z.string(),
  participant: z.string().min(1).nullable(),
  dates: DateFilterSchema,
  outcome: OutcomeFilterSchema,
});

export type DateFilter = z.infer<typeof DateFilterSchema>;
export type OutcomeFilter = z.infer<typeof OutcomeFilterSchema>;
export type HistoryFilters = z.infer<typeof HistoryFiltersSchema>;

export const NO_HISTORY_FILTERS: HistoryFilters = {
  search: '',
  participant: null,
  dates: { kind: 'all-time' },
  outcome: 'all',
};

// One reading position in Merge → History (§3.3.2): the query, the Landing whose
// detail is open (null = the list), and the list scroll captured when it opened.
// Lives in app-shell view state — never in a component, never persisted with the
// assessment. A Landing is addressed by full UUID; row indexes are never stored.
export const HistoryViewSchema = z.object({
  filters: HistoryFiltersSchema,
  landing: z.string().uuid().nullable(),
  scroll: z.number().min(0),
  // The affected record the open detail is anchored on (§4.5). Null = the Landing as
  // its default disclosure shows it. Only ever set while `landing` is.
  record: RecordRefSchema.nullable(),
});

export type HistoryView = z.infer<typeof HistoryViewSchema>;

export const NO_HISTORY_VIEW: HistoryView = {
  filters: NO_HISTORY_FILTERS,
  landing: null,
  scroll: 0,
  record: null,
};

// The guard the app shell hands `readView`: history.state is an I/O boundary
// shared with the sibling Author app under one key (utils/view-history.ts).
export function isHistoryView(raw: unknown): raw is HistoryView {
  return HistoryViewSchema.safeParse(raw).success;
}

const sameDates = (a: DateFilter, b: DateFilter): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'all-time' || b.kind === 'all-time') return true;
  return a.from === b.from && a.to === b.to;
};

const sameRecord = (a: RecordRef | null, b: RecordRef | null): boolean =>
  a === null || b === null ? a === b : sameRecordRef(a, b);

// Two readings that describe the same position — the shell's view equality.
export function sameHistoryView(a: HistoryView | null, b: HistoryView | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.landing === b.landing &&
    sameRecord(a.record, b.record) &&
    a.scroll === b.scroll &&
    a.filters.search === b.filters.search &&
    a.filters.participant === b.filters.participant &&
    a.filters.outcome === b.filters.outcome &&
    sameDates(a.filters.dates, b.filters.dates)
  );
}

// The outcome filter's options in control order (§4.3).
export const OUTCOME_FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'all', label: 'All outcomes' },
  { value: 'new', label: 'New units' },
  { value: 'changed', label: 'Standing changes' },
  { value: 'cleared', label: 'Cleared units' },
  { value: 'agreements', label: 'Agreements' },
  { value: 'resolved', label: 'Resolved clashes' },
  { value: 'parties', label: 'Party decisions' },
];

// True when anything narrows the list — what `Clear filters` is offered on.
export function isNarrowed(filters: HistoryFilters): boolean {
  return (
    filters.search !== '' ||
    filters.participant !== null ||
    filters.dates.kind !== 'all-time' ||
    filters.outcome !== 'all'
  );
}

// Everything a History reading needs beyond the ledger: the workbook that names
// questions and dimensions, the estate roster that names party targets, and the
// viewer's calendar the dates are read in.
export type HistoryContext = {
  workbook: Pick<Workbook, 'dimensions' | 'objectives'>;
  parties: readonly Party[];
  viewer: Viewer;
};

// A calendar day in the viewer's zone, derived from an INSTANT. The pure core
// reads neither clock nor environment — the instant is stamped by
// the app shell and passed in.
export function calendarDateOf(at: string, viewer: Viewer): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: viewer.zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(at));
  const part = (type: 'year' | 'month' | 'day'): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// The Landing's calendar date in the viewer's zone (§2.5.2).
export function landingDate(landing: LandingEnvelope, viewer: Viewer): CalendarDate {
  return calendarDateOf(landing.at, viewer);
}

// The Landing's clock time in the viewer's locale and zone, e.g. `14:32`.
export function landingTime(landing: LandingEnvelope, viewer: Viewer): string {
  return new Intl.DateTimeFormat(viewer.locale, {
    timeZone: viewer.zone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(landing.at));
}

// The calendar day in words, e.g. `10 August 2026` — the date group heading and the
// detail's landed sentence say it the same way.
export function longDateOf(date: CalendarDate, viewer: Viewer): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(viewer.locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// A date group's heading, e.g. `Landings on 10 August 2026`.
export function dateGroupHeading(date: CalendarDate, viewer: Viewer): string {
  return `Landings on ${longDateOf(date, viewer)}`;
}

// Every string this Landing is searchable by, lower-cased (§4.3): participant,
// note, full Landing id (a short id matches as its prefix), and per record the
// question id, question text, target label, and the names in a party record's
// before/after sets.
export function searchTerms(landing: Landing, ctx: HistoryContext): string[] {
  const terms: string[] = [landing.participant, landing.id];
  if (landing.note !== undefined) terms.push(landing.note);
  for (const record of landing.records) {
    if (record.kind === 'party') {
      for (const party of [...record.before, ...record.after]) terms.push(party.name);
      continue;
    }
    terms.push(record.questionId);
    const question = questionOf(ctx.workbook, record.questionId);
    if (question !== undefined) terms.push(question.text);
    terms.push(targetLabel(ctx.workbook, ctx.parties, record.target));
  }
  return terms.map((term) => term.toLowerCase());
}

const outcomeCount = (summary: LandingSummary, outcome: OutcomeFilter): number => {
  switch (outcome) {
    case 'all':
      return 1;
    case 'new':
      return summary.newUnits;
    case 'changed':
      return summary.changed;
    case 'cleared':
      return summary.cleared;
    case 'agreements':
      return summary.agreements;
    case 'resolved':
      return summary.resolvedClashes;
    case 'parties':
      return summary.partyDecisions;
  }
};

function withinDates(landing: Landing, viewer: Viewer, dates: DateFilter): boolean {
  if (dates.kind === 'all-time') return true;
  const date = landingDate(landing, viewer);
  if (dates.from !== null && date < dates.from) return false;
  if (dates.to !== null && date > dates.to) return false;
  return true;
}

// True when this Landing survives every filter (§4.3).
export function landingMatches(
  landing: Landing,
  ctx: HistoryContext,
  filters: HistoryFilters,
): boolean {
  if (filters.participant !== null && landing.participant !== filters.participant) return false;
  if (!withinDates(landing, ctx.viewer, filters.dates)) return false;
  if (outcomeCount(landingSummary(landing), filters.outcome) === 0) return false;
  const search = filters.search.trim().toLowerCase();
  if (search === '') return true;
  return searchTerms(landing, ctx).some((term) => term.includes(search));
}

// The distinct participants the ledger holds, alphabetical — the participant
// filter's options beside `All participants`.
export function landingParticipants(ledger: readonly Landing[]): string[] {
  return [...new Set(ledger.map((landing) => landing.participant))].sort((a, b) =>
    a.localeCompare(b),
  );
}

// One calendar day of matching Landings. Groups follow REVERSED recorded order
// and break on a date change, so a backwards clock change repeats a heading
// rather than reordering or merging Landings.
export type HistoryGroup = { date: CalendarDate; heading: string; landings: Landing[] };

export function historyGroups(
  ledger: readonly Landing[],
  ctx: HistoryContext,
  filters: HistoryFilters,
): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const matches = ledger.filter((landing) => landingMatches(landing, ctx, filters));
  for (const landing of [...matches].reverse()) {
    const date = landingDate(landing, ctx.viewer);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.date === date) {
      last.landings.push(landing);
      continue;
    }
    groups.push({ date, heading: dateGroupHeading(date, ctx.viewer), landings: [landing] });
  }
  return groups;
}

export function landingById(ledger: readonly Landing[], id: string): Landing | null {
  return ledger.find((landing) => landing.id === id) ?? null;
}

// Which screen Merge → History shows for one reading position.
// A named-but-absent Landing wins over the no-ledger state: a saved reading
// position is EXPLAINED, never silently replaced by a different screen
// (§3.3.5 — "It never substitutes the nearest Landing").
export type HistoryScreen =
  | { kind: 'missing'; id: string }
  | { kind: 'no-ledger' }
  | { kind: 'detail'; landing: Landing }
  | { kind: 'list' };

export function historyScreen(ledger: readonly Landing[], view: HistoryView): HistoryScreen {
  if (view.landing !== null) {
    const landing = landingById(ledger, view.landing);
    if (landing === null) return { kind: 'missing', id: view.landing };
    return { kind: 'detail', landing };
  }
  if (ledger.length === 0) return { kind: 'no-ledger' };
  return { kind: 'list' };
}

// The Landing an exact search entry names (§3.3.4): a full UUID, or a short id
// exactly one Landing carries. Null when the text names none or several.
export function landingForSearch(ledger: readonly Landing[], search: string): Landing | null {
  const entry = search.trim().toLowerCase();
  if (entry === '') return null;
  const full = landingById(ledger, entry);
  if (full !== null) return full;
  if (entry.length !== 7) return null;
  const short = ledger.filter((landing) => shortLandingId(landing.id) === entry);
  return short.length === 1 ? short[0] : null;
}

const phrase = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

// The non-zero counts as a row says them (§4.3): the effect counts in
// new / standing changes / cleared / unchanged order, then the process counts in
// agreements / party decisions / facilitator-resolved clashes order. A zero count
// has no phrase; `unitsReviewed` is not one of these.
export function landingCountPhrases(summary: LandingSummary): string[] {
  const phrases: string[] = [];
  if (summary.newUnits > 0) phrases.push(phrase(summary.newUnits, 'new', 'new'));
  if (summary.changed > 0)
    phrases.push(phrase(summary.changed, 'standing change', 'standing changes'));
  if (summary.cleared > 0) phrases.push(phrase(summary.cleared, 'cleared', 'cleared'));
  if (summary.unchanged > 0) phrases.push(phrase(summary.unchanged, 'unchanged', 'unchanged'));
  if (summary.agreements > 0) phrases.push(phrase(summary.agreements, 'agreement', 'agreements'));
  if (summary.partyDecisions > 0)
    phrases.push(phrase(summary.partyDecisions, 'party decision', 'party decisions'));
  if (summary.resolvedClashes > 0)
    phrases.push(
      phrase(
        summary.resolvedClashes,
        'facilitator-resolved clash',
        'facilitator-resolved clashes',
      ),
    );
  return phrases;
}

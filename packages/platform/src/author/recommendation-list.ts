import type { Horizon, Recommendation, RecommendationLink, Workbook } from '../schema';
import { LINK_KIND_LABELS, linkTargets } from './edit-recommendations';

// The recommendations catalogue as a LIST: one row per recommendation, resolved
// against the draft, plus the narrowing an author reads it through. The list
// page computes nothing itself — every label, count and sentence is built here,
// so the controls and what they claim can never disagree (the merge queue's
// invariant #13, applied to the author side).

/** One catalogue row: the record, its position (so the caller can still scope
 *  strict issues by index after filtering), and its links resolved to the
 *  labels the picker would show. A dangling link keeps its raw id — never
 *  blank, exactly as the links editor renders it. */
export type RecommendationRow = {
  recommendation: Recommendation;
  /** Index in `workbook.recommendations` — the strict-issue path segment. */
  index: number;
  links: { link: RecommendationLink; kindLabel: string; label: string }[];
};

/** Whether a row's links are drawn on at all. A recommendation with no link
 *  never fires, so "unlinked" is the one facet worth its own control. */
export type RecommendationLinkage = 'all' | 'linked' | 'unlinked';

/** The list's narrowing. `query` is free text over everything a row shows —
 *  including the labels of the questions attached to it. */
export type RecommendationFilter = {
  query: string;
  horizon: Horizon | 'all';
  linkage: RecommendationLinkage;
};

export const NO_RECOMMENDATION_FILTER: RecommendationFilter = {
  query: '',
  horizon: 'all',
  linkage: 'all',
};

export function isRecommendationFilterNarrowed(filter: RecommendationFilter): boolean {
  return filter.query.trim() !== '' || filter.horizon !== 'all' || filter.linkage !== 'all';
}

/** Every recommendation as a row, in workbook order. */
export function recommendationRows(wb: Workbook): RecommendationRow[] {
  return wb.recommendations.map((recommendation, index) => ({
    recommendation,
    index,
    links: recommendation.links.map((link) => ({
      link,
      kindLabel: LINK_KIND_LABELS[link.kind],
      label: linkTargets(wb, link.kind).find((t) => t.id === link.id)?.label ?? link.id,
    })),
  }));
}

// Everything a query is matched against: the record's own prose plus the link
// labels, so "which questions are attached" is answerable by typing a question
// id or a word from its text.
function haystack(row: RecommendationRow): string {
  const r = row.recommendation;
  return [
    r.id,
    r.title,
    r.action,
    ...r.body,
    r.horizon,
    ...row.links.map((l) => `${l.kindLabel} ${l.link.id} ${l.label}`),
  ]
    .join(' ')
    .toLowerCase();
}

function matchesQuery(row: RecommendationRow, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t !== '');
  if (terms.length === 0) return true;
  const text = haystack(row);
  return terms.every((t) => text.includes(t));
}

function matchesHorizon(row: RecommendationRow, horizon: RecommendationFilter['horizon']): boolean {
  return horizon === 'all' || row.recommendation.horizon === horizon;
}

function matchesLinkage(row: RecommendationRow, linkage: RecommendationLinkage): boolean {
  if (linkage === 'all') return true;
  const linked = row.recommendation.links.length > 0;
  return linkage === 'linked' ? linked : !linked;
}

/** The rows the list shows under `filter`, in workbook order. */
export function filterRecommendationRows(
  rows: RecommendationRow[],
  filter: RecommendationFilter,
): RecommendationRow[] {
  return rows.filter(
    (row) =>
      matchesQuery(row, filter.query) &&
      matchesHorizon(row, filter.horizon) &&
      matchesLinkage(row, filter.linkage),
  );
}

/** One option of a narrowing, carrying the count it would leave. */
export type RecommendationOption<T extends string> = { value: T; label: string; count: number };

/** Every option of every narrowing, each counted with THAT option applied and
 *  the rest of the filter held — so a count is what pressing the option would
 *  actually leave, not a global tally. */
export type RecommendationFacets = {
  horizons: RecommendationOption<Horizon | 'all'>[];
  linkage: RecommendationOption<RecommendationLinkage>[];
  shown: number;
  total: number;
};

const HORIZON_LABELS: Readonly<Record<Horizon, string>> = {
  renewal: 'Renewal',
  strategic: 'Strategic',
};

const LINKAGE_LABELS: Readonly<Record<RecommendationLinkage, string>> = {
  all: 'All',
  linked: 'Linked',
  unlinked: 'Unlinked',
};

export function recommendationFacets(
  rows: RecommendationRow[],
  filter: RecommendationFilter,
): RecommendationFacets {
  const count = (patch: Partial<RecommendationFilter>): number =>
    filterRecommendationRows(rows, { ...filter, ...patch }).length;

  return {
    horizons: [
      { value: 'all', label: 'All', count: count({ horizon: 'all' }) },
      ...(['renewal', 'strategic'] as const).map((h) => ({
        value: h,
        label: HORIZON_LABELS[h],
        count: count({ horizon: h }),
      })),
    ],
    linkage: (['all', 'linked', 'unlinked'] as const).map((l) => ({
      value: l,
      label: LINKAGE_LABELS[l],
      count: count({ linkage: l }),
    })),
    shown: filterRecommendationRows(rows, filter).length,
    total: rows.length,
  };
}

/** An option's accessible name: a label beside a bare numeral reads as nothing
 *  on its own, so the count is spelled out. */
export function recommendationOptionName(label: string, count: number): string {
  return `${label} — ${count} recommendation${count === 1 ? '' : 's'}`;
}

/** The current narrowing in one sentence — the list's own answer to "what am I
 *  looking at, and why is it short?". The vocabulary lives here so the bar and
 *  the controls always agree. */
export function recommendationFilterSummary(
  filter: RecommendationFilter,
  shown: number,
  total: number,
): string {
  const plural = (n: number): string => `recommendation${n === 1 ? '' : 's'}`;
  if (!isRecommendationFilterNarrowed(filter)) {
    return `Showing all ${total} ${plural(total)}.`;
  }

  const clauses: string[] = [];
  if (filter.horizon !== 'all') clauses.push(`${HORIZON_LABELS[filter.horizon].toLowerCase()} horizon`);
  if (filter.linkage === 'linked') clauses.push('linked to something');
  if (filter.linkage === 'unlinked') clauses.push('not linked to anything yet');
  const query = filter.query.trim();
  if (query !== '') clauses.push(`matching “${query}”`);

  const tail = clauses.length === 0 ? '' : ` ${clauses.join(', ')}`;
  return `Showing ${shown} of ${total} — ${plural(total)}${tail}.`;
}

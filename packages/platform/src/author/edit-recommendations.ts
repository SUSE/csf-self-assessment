import type { Recommendation, RecommendationLink, Workbook } from '../schema';
import { nextId } from './links';

// --- recommendations (spec docs/specs/recommendations.md §4.5) ---------------

// A blank recommendation the author fills in place. `whenAtOrBelow: 0` because
// SEAL-0 is the most conservative threshold to start from and the repo refuses to
// bake a marketing threshold into TypeScript (spec §2.7); `horizon: 'strategic'`
// because an unauthored pitch must not claim renewal-scale immediacy.
export function addRecommendation(wb: Workbook): Workbook {
  const id = nextId(wb.recommendations.map((r) => r.id), 'rec');
  const recommendation: Recommendation = {
    id,
    title: 'New recommendation',
    action: '',
    body: [],
    links: [],
    whenAtOrBelow: 0,
    horizon: 'strategic',
    order: wb.recommendations.length,
  };
  return { ...wb, recommendations: [...wb.recommendations, recommendation] };
}

// Patch one recommendation's scalar fields. `body` and `links` are absent by
// design — each moves through its own op. Nothing in the workbook references a
// recommendation id, so an id rename cascades nowhere.
export function updateRecommendation(
  wb: Workbook,
  recommendationId: string,
  patch: Partial<
    Pick<Recommendation, 'id' | 'title' | 'action' | 'whenAtOrBelow' | 'horizon' | 'order'>
  >,
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) =>
      r.id === recommendationId ? { ...r, ...patch } : r,
    ),
  };
}

export function removeRecommendation(wb: Workbook, recommendationId: string): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.filter((r) => r.id !== recommendationId),
  };
}

// Replace a recommendation's body paragraphs whole — the setFrontSheet twin.
export function setRecommendationBody(
  wb: Workbook,
  recommendationId: string,
  lines: string[],
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) =>
      r.id === recommendationId ? { ...r, body: lines } : r,
    ),
  };
}

// Append `link` to a recommendation, idempotently: a (kind, id) pair already
// present is a no-op, so the catalogue never carries a duplicate link.
export function linkRecommendation(
  wb: Workbook,
  recommendationId: string,
  link: RecommendationLink,
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) => {
      if (r.id !== recommendationId) return r;
      if (r.links.some((l) => l.kind === link.kind && l.id === link.id)) return r;
      return { ...r, links: [...r.links, link] };
    }),
  };
}

// Drop every link matching `link` on (kind, id). An unknown pair is a no-op.
export function unlinkRecommendation(
  wb: Workbook,
  recommendationId: string,
  link: RecommendationLink,
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) =>
      r.id === recommendationId
        ? { ...r, links: r.links.filter((l) => !(l.kind === link.kind && l.id === link.id)) }
        : r,
    ),
  };
}

export type RecommendationLinkKind = RecommendationLink['kind'];

// The kind selector's label per kind. A Record over the union, so adding a fourth
// link kind to the schema (spec §2.2) fails to compile until the picker names it.
export const LINK_KIND_LABELS: Readonly<Record<RecommendationLinkKind, string>> = {
  question: 'Question',
  dimension: 'Dimension',
  objective: 'Objective',
};

// The kinds in the order the selector offers them.
export const LINK_KINDS: readonly RecommendationLinkKind[] = [
  'question',
  'dimension',
  'objective',
];

// One choosable link destination: the id that is stored, and the string the
// picker shows.
export type LinkTarget = { id: string; label: string };

// Everything of one kind an author may link to, in workbook order.
export function linkTargets(wb: Workbook, kind: RecommendationLinkKind): LinkTarget[] {
  const label = (id: string, name: string, fallback: string): LinkTarget => ({
    id,
    label: `${id} — ${name === '' ? fallback : name}`,
  });
  switch (kind) {
    case 'question':
      return wb.objectives.flatMap((o) =>
        o.questions.map((q) => label(q.id, q.text, '(untitled question)')),
      );
    case 'dimension':
      return wb.dimensions.map((d) => label(d.id, d.name, '(unnamed dimension)'));
    case 'objective':
      return wb.objectives.map((o) => label(o.id, o.name, '(unnamed objective)'));
  }
}

// The catalogue split against one link destination — what already points here and
// what could. The question / objective editor's Recommendations row renders
// exactly this. Both halves are in workbook order.
export type LinkStanding = { linked: Recommendation[]; unlinked: Recommendation[] };

export function linkStanding(wb: Workbook, link: RecommendationLink): LinkStanding {
  const linked: Recommendation[] = [];
  const unlinked: Recommendation[] = [];
  for (const rec of wb.recommendations) {
    const points = rec.links.some((l) => l.kind === link.kind && l.id === link.id);
    (points ? linked : unlinked).push(rec);
  }
  return { linked, unlinked };
}

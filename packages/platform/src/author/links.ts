import type { Question, RecommendationLink, Workbook } from '../schema';

// The shared preamble for every `edit-*` module, and the id/link/question
// helpers they all reach for.
//
// Pure workbook-definition edits (spec §9 S9). Every structural change the
// workbench makes goes through one of these — the components hold no edit
// logic, so every cascade (a dimension rename rewrites appliesTo; a removal
// strips it) is decided and tested HERE, once. All functions return a new
// Workbook and never mutate the input. Inputs are Workbook-TYPED but only
// draft-valid; everything tolerates empty arrays and empty strings.

// The smallest free `${prefix}-${n}` (n ≥ 1) among `taken` — deterministic id
// generation with no clock or randomness (pure-core seam).
export function nextId(taken: string[], prefix: string): string {
  const set = new Set(taken);
  let n = 1;
  while (set.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function allQuestionIds(wb: Workbook): string[] {
  return wb.objectives.flatMap((o) => o.questions.map((q) => q.id));
}

// Rewrite one link kind's ids across the whole catalogue — a rename is not a
// removal, so a renamed dimension/objective/question keeps every link that named
// it (R19 would otherwise break the moment an author renames).
export function renameLinks(
  wb: Workbook,
  kind: RecommendationLink['kind'],
  from: string,
  to: string,
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) => ({
      ...r,
      links: r.links.map((l) => (l.kind === kind && l.id === from ? { ...l, id: to } : l)),
    })),
  };
}

// Drop every link the predicate rejects. An emptied `links` array is left alone:
// it turns the recommendation strict-invalid and glows in the section, exactly as
// removeDimension leaves a question with an empty appliesTo — the new linkage is
// the author's call, not a cascade's.
export function filterLinks(
  wb: Workbook,
  keep: (link: RecommendationLink) => boolean,
): Workbook {
  return {
    ...wb,
    recommendations: wb.recommendations.map((r) => ({ ...r, links: r.links.filter(keep) })),
  };
}

export function mapQuestions(wb: Workbook, fn: (q: Question) => Question): Workbook {
  return {
    ...wb,
    objectives: wb.objectives.map((o) => ({
      ...o,
      questions: o.questions.map(fn),
    })),
  };
}

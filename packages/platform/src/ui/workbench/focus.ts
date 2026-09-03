import type { ZodIssue } from 'zod';
import type { Objective, Question, Recommendation, Workbook } from '../../schema';
import type { InstrumentSection } from '../instrument-wheel/model';

// Which single target the Author's stage is showing ( — one focus,
// reached by navigation, not by scrolling a 39k-px wall). The instrument
// sections (overview / front sheet / objectives / questions / dimensions /
// test estates / recommendations)
// are always valid targets; `objectives` and `recommendations` are LIST pages
// (manage the set — add/edit/delete), while the three content targets carry the
// id of the objective, question or recommendation they point at, so the header
// and stage body agree by identity, not by index. `questions` is the whole
// instrument's text in reading order — an INDEX, not a set editor: a question is
// created on its objective and edited on its own page, so this page only reaches
// them (the facilitator's Questions section, given to the author). Overview owns the workbook meta + the banner issues (weights
// sum / unique ids / sealLevels) that no section below owns.
export type FocusRef =
  | { kind: 'overview' }
  | { kind: 'frontSheet' }
  | { kind: 'objectives' }
  | { kind: 'questions' }
  | { kind: 'dimensions' }
  | { kind: 'roles' }
  | { kind: 'parties' }
  | { kind: 'testEstates' }
  | { kind: 'recommendations' }
  | { kind: 'objective'; id: string }
  | { kind: 'question'; id: string }
  | { kind: 'recommendation'; id: string };

// The FocusRef for a whole instrument section. Every section target is
// fieldless, but TypeScript cannot distribute a union discriminant across a
// discriminated union — so the mapping is written once here, as a total record,
// instead of cast at each call site.
const SECTION_FOCUS: Record<InstrumentSection, FocusRef> = {
  objectives: { kind: 'objectives' },
  dimensions: { kind: 'dimensions' },
  parties: { kind: 'parties' },
  roles: { kind: 'roles' },
  testEstates: { kind: 'testEstates' },
};

export function sectionFocus(section: InstrumentSection): FocusRef {
  return SECTION_FOCUS[section];
}

// Where the stage opens: the first objective's first question — never the
// meta form. Falls back to the objective itself when it has no questions yet,
// and to the overview when there are no objectives at all (an empty draft).
export function firstFocus(draft: Workbook): FocusRef {
  const first = draft.objectives[0];
  if (!first) return { kind: 'overview' };
  const question = first.questions[0];
  if (!question) return { kind: 'objective', id: first.id };
  return { kind: 'question', id: question.id };
}

// Route a strict-validation issue to the target that owns it, so the header's
// issue jump focuses the offending editor instead of scrolling. Indexes in the
// ZodIssue.path are resolved to ids against the draft (the header navigates by
// id). Anything not owned by a section below — meta, sealLevels, and the
// top-level refinements (weights sum, unique ids, "add an objective") — lands
// on the overview, which renders those as banner issues.
export function focusForIssue(draft: Workbook, issue: ZodIssue): FocusRef {
  const path = issue.path;
  if (path[0] === 'objectives' && typeof path[1] === 'number') {
    const objective = draft.objectives[path[1]];
    if (objective) {
      if (path[2] === 'questions' && typeof path[3] === 'number') {
        const question = objective.questions[path[3]];
        if (question) return { kind: 'question', id: question.id };
      }
      return { kind: 'objective', id: objective.id };
    }
  }
  if (path[0] === 'dimensions') return { kind: 'dimensions' };
  if (path[0] === 'roles') return { kind: 'roles' };
  if (path[0] === 'parties') return { kind: 'parties' };
  if (path[0] === 'frontSheet') return { kind: 'frontSheet' };
  if (path[0] === 'testEstates') return { kind: 'testEstates' };
  if (path[0] === 'recommendations' && typeof path[1] === 'number') {
    const recommendation = draft.recommendations[path[1]];
    if (recommendation) return { kind: 'recommendation', id: recommendation.id };
  }
  if (path[0] === 'recommendations') return { kind: 'recommendations' };
  // The recommender is workbook-level attribution, authored on the list page
  // beside the catalogue it speaks for.
  if (path[0] === 'recommender') return { kind: 'recommendations' };
  return { kind: 'overview' };
}

// True when `raw` is a well-formed FocusRef. Restored focuses come from opaque
// persisted state (history.state — see view-history.ts), which a sibling app or
// an older build may have written in a different shape; validate before trusting
// one so a foreign entry degrades to the default view instead of crashing.
export function isFocusRef(raw: unknown): raw is FocusRef {
  if (raw === null || typeof raw !== 'object') return false;
  const kind = (raw as { kind?: unknown }).kind;
  switch (kind) {
    case 'overview':
    case 'frontSheet':
    case 'objectives':
    case 'questions':
    case 'dimensions':
    case 'roles':
    case 'parties':
    case 'testEstates':
    case 'recommendations':
      return true;
    case 'objective':
    case 'question':
    case 'recommendation':
      return typeof (raw as { id?: unknown }).id === 'string';
    default:
      return false;
  }
}

// Keep a focus pointing at something that still exists. After a Remove the
// held focus can name a gone objective/question — fall back to firstFocus so
// the stage never renders a dangling target. The instrument sections are
// always present, so their focuses pass straight through. A non-FocusRef (a
// stale/foreign persisted focus) also falls back rather than crashing.
export function resolveFocus(draft: Workbook, focus: FocusRef): FocusRef {
  if (!isFocusRef(focus)) return firstFocus(draft);
  switch (focus.kind) {
    case 'objective':
      return draft.objectives.some((o) => o.id === focus.id)
        ? focus
        : firstFocus(draft);
    case 'question':
      return draft.objectives.some((o) => o.questions.some((q) => q.id === focus.id))
        ? focus
        : firstFocus(draft);
    case 'recommendation':
      // A removed recommendation falls back to its own LIST rather than to the
      // first question: the list is where the delete was issued from, so that
      // is the page the author expects to land on.
      return draft.recommendations.some((r) => r.id === focus.id)
        ? focus
        : { kind: 'recommendations' };
    default:
      return focus;
  }
}

// True when two focuses name the same target. The view store needs this so a
// popstate-driven state change is not mistaken for a fresh navigation; keeping
// it beside the union means a new id-carrying kind is compared by construction.
export function sameFocus(a: FocusRef, b: FocusRef): boolean {
  if (a.kind !== b.kind) return false;
  const id = (f: FocusRef): string | null => ('id' in f ? f.id : null);
  return id(a) === id(b);
}

// A focused question with the indices `issuesUnder` needs for its path prefix.
export type QuestionSite = {
  objective: Objective;
  question: Question;
  objectiveIndex: number;
  questionIndex: number;
};
// A focused recommendation with the index `issuesUnder` needs.
export type RecommendationSite = { recommendation: Recommendation; index: number };

export function focusKey(focus: FocusRef): string {
  return 'id' in focus ? `${focus.kind}:${focus.id}` : focus.kind;
}

// Every stage key left to right along the header's icon row — the carousel axis.
// It runs the instrument sections in SectionNav order (each recommendation behind
// its list), then Test estates, then the Questions index and the objective /
// question walk, and finally the app's own destinations.
export function stageOrder(draft: Workbook, stageIds: readonly string[]): string[] {
  const seq: string[] = ['overview', 'frontSheet', 'objectives', 'dimensions', 'roles', 'parties', 'recommendations'];
  for (const r of draft.recommendations) seq.push(`recommendation:${r.id}`);
  seq.push('testEstates', 'questions');
  for (const o of draft.objectives) {
    seq.push(`objective:${o.id}`);
    for (const q of o.questions) seq.push(`question:${q.id}`);
  }
  for (const id of stageIds) seq.push(`stage:${id}`);
  return seq;
}

export function questionSite(draft: Workbook, questionId: string): QuestionSite | null {
  for (let oi = 0; oi < draft.objectives.length; oi++) {
    const objective = draft.objectives[oi];
    if (objective === undefined) continue;
    const qi = objective.questions.findIndex((q) => q.id === questionId);
    const question = objective.questions[qi];
    if (question !== undefined) {
      return { objective, question, objectiveIndex: oi, questionIndex: qi };
    }
  }
  return null;
}

export function objectiveSite(draft: Workbook, objectiveId: string): Objective | null {
  return draft.objectives.find((o) => o.id === objectiveId) ?? null;
}

export function recommendationSite(
  draft: Workbook,
  recommendationId: string,
): RecommendationSite | null {
  const index = draft.recommendations.findIndex((r) => r.id === recommendationId);
  const recommendation = draft.recommendations[index];
  return recommendation === undefined ? null : { recommendation, index };
}

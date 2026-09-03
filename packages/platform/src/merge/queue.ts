import type { ClashClass, ClashResolution, Question, Target, Workbook } from '../schema';
import { questionOf, targetKey } from '../assessment';
import { gates, scores } from '../score-engine/scope';
import type { LandingClash } from './clash-types';
import { clashCandidates } from './clash-types';
import { resolveClash } from './resolve';

// The clash queue's narrowing (merge.md §4.4): pure predicates over a landing's
// clashes — no clock, no ids, no evaluate run. `canMoveFloor` is STRUCTURAL: the
// engine gates the estate floor on materiality × the dimension's `critical` flag,
// so the workbook alone says whether a unit could ever move the floor.
//
// There is deliberately NO bulk apply here (invariant #7): every clash is
// decided one at a time, by a human, on its own card. A suggestion exists for
// nearly every divergence, so any control that applied suggestions to a set —
// however narrowed — was a rubber stamp with extra steps.

/** Which class the queue shows; 'all' applies no class narrowing. */
export type ClashClassFilter = 'all' | ClashClass;

/** Which decision state the queue shows; 'all' applies no narrowing. */
export type ClashStatusFilter = 'all' | 'open' | 'decided';

/** The queue's narrowing (merge.md §4.4). Fields are independent switches; the
 *  unnarrowed value is NO_FILTER. */
export type QueueFilter = {
  clashClass: ClashClassFilter;
  /** A candidate's name — keeps the clashes that candidate is party to. null = all. */
  participant: string | null;
  /** `open` = no resolution settles it yet; `decided` = one does. */
  status: ClashStatusFilter;
  floorMoversOnly: boolean;
  /** Hide clashes on questions that score nothing — `informational` and `na`.
   *  A `ranking` clash stays: it moves the number. Renamed from
   *  `hideInformational`. */
  hideNonScoring: boolean;
  oneRungOnly: boolean;
};

export const NO_FILTER: QueueFilter = {
  clashClass: 'all',
  participant: null,
  status: 'all',
  floorMoversOnly: false,
  hideNonScoring: false,
  oneRungOnly: false,
};

/** True when this unit's answer can gate the estate floor: a `material` question
 *  answered about a party or the whole estate, or about a dimension (or a stratum
 *  of one) the workbook marks `critical`. `ranking`, `informational` and `na`
 *  materiality never gate — `ranking` still scores, the other two score nothing;
 *  a non-critical dimension sweeps the score but never the floor (score-engine).
 *  A question the workbook does not carry: false. */
export function canMoveFloor(clash: LandingClash, workbook: Workbook): boolean {
  const question = questionOf(workbook, clash.questionId);
  if (question === undefined || !gates(question.defaultMateriality)) return false;
  const target: Target = clash.target;
  switch (target.kind) {
    case 'assessment':
    case 'party':
      return true;
    case 'dimension':
    case 'dimension-stratum':
      return workbook.dimensions.find((d) => d.id === target.dimension)?.critical === true;
  }
}

/** True when the clash's question scores nothing — recorded only. Replaces
 *  `isInformational`. */
export function isNonScoring(clash: LandingClash, workbook: Workbook): boolean {
  const question = questionOf(workbook, clash.questionId);
  return question !== undefined && !scores(question.defaultMateriality);
}

/** True for a `divergence` whose two answered seals sit on ADJACENT rungs of the
 *  question's ladder in authored order — on a sparse 0/2/4 ladder, SEAL 0 and
 *  SEAL 2 are one rung apart. False for every other class. */
export function isOneRungApart(clash: LandingClash, workbook: Workbook): boolean {
  if (clash.kind !== 'unit-clash' || clash.clash !== 'divergence') return false;
  const question = questionOf(workbook, clash.questionId);
  if (question === undefined) return false;
  const base = clash.base.answer;
  const incoming = clash.incoming.answer;
  if (base.state !== 'answered' || incoming.state !== 'answered') return false;
  const a = rungIndex(question, base.rungId);
  const b = rungIndex(question, incoming.rungId);
  if (a === -1 || b === -1) return false;
  return Math.abs(a - b) === 1;
}

const rungIndex = (question: Question, rungId: string): number =>
  question.ladder.findIndex((rung) => rung.id === rungId);

/** Every candidate name in play across these clashes, alphabetical. */
export function participantsOf(clashes: LandingClash[]): string[] {
  const names = new Set<string>();
  for (const clash of clashes) {
    for (const candidate of clashCandidates(clash)) names.add(candidate.from);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

const unitKey = (questionId: string, target: Target): string => `${questionId} ${targetKey(target)}`;

/** The unit keys of the clashes a resolution already settles. ONE definition of
 *  "decided", shared by the status filter, each group's count and the Land gate,
 *  so the queue can never disagree with itself about what is left. */
const decidedKeys = (clashes: LandingClash[], resolutions: ClashResolution[]): Set<string> => {
  const byKey = new Map(resolutions.map((r) => [unitKey(r.questionId, r.target), r]));
  const keys = new Set<string>();
  for (const clash of clashes) {
    const key = unitKey(clash.questionId, clash.target);
    if (resolveClash(clash, byKey.get(key)) !== null) keys.add(key);
  }
  return keys;
};

/** True when a resolution settles this clash — a choice that does not fit the
 *  clash's class settles nothing (`resolveClash`). */
export function isDecided(clash: LandingClash, resolutions: ClashResolution[]): boolean {
  return decidedKeys([clash], resolutions).size === 1;
}

/** The clashes this filter shows, in input order. */
export function filterClashes(
  clashes: LandingClash[],
  workbook: Workbook,
  filter: QueueFilter,
  resolutions: ClashResolution[],
): LandingClash[] {
  const decided = filter.status === 'all' ? new Set<string>() : decidedKeys(clashes, resolutions);
  return clashes.filter((clash) => {
    if (filter.clashClass !== 'all' && clash.clash !== filter.clashClass) return false;
    if (
      filter.participant !== null &&
      !clashCandidates(clash).some((c) => c.from === filter.participant)
    )
      return false;
    if (filter.status !== 'all') {
      const settled = decided.has(unitKey(clash.questionId, clash.target));
      if (filter.status === 'decided' ? !settled : settled) return false;
    }
    if (filter.floorMoversOnly && !canMoveFloor(clash, workbook)) return false;
    if (filter.hideNonScoring && isNonScoring(clash, workbook)) return false;
    if (filter.oneRungOnly && !isOneRungApart(clash, workbook)) return false;
    return true;
  });
}

/** One objective's clashes — the files-changed list of merge.md §4.2. `decided`
 *  counts the ones a resolution already settles, by `resolveClash`. */
export type QueueGroup = {
  objectiveId: string;
  name: string;
  clashes: LandingClash[];
  decided: number;
};

/** These clashes grouped by objective, in workbook objective order; an objective
 *  with no clash is absent. A clash on a question the workbook does not carry
 *  lands in a final `{ objectiveId: 'unknown', name: 'Unknown objective' }` group
 *  — never dropped (invariant #4). */
export function queueGroups(
  clashes: LandingClash[],
  workbook: Workbook,
  resolutions: ClashResolution[],
): QueueGroup[] {
  const decidedIn = (group: LandingClash[]): number => {
    const keys = decidedKeys(group, resolutions);
    return group.filter((clash) => keys.has(unitKey(clash.questionId, clash.target))).length;
  };

  const grouped: QueueGroup[] = [];
  const placed = new Set<LandingClash>();
  for (const objective of workbook.objectives) {
    const ids = new Set(objective.questions.map((q) => q.id));
    const own = clashes.filter((clash) => ids.has(clash.questionId));
    if (own.length === 0) continue;
    for (const clash of own) placed.add(clash);
    grouped.push({
      objectiveId: objective.id,
      name: objective.name,
      clashes: own,
      decided: decidedIn(own),
    });
  }
  const leftovers = clashes.filter((clash) => !placed.has(clash));
  if (leftovers.length > 0) {
    grouped.push({
      objectiveId: 'unknown',
      name: 'Unknown objective',
      clashes: leftovers,
      decided: decidedIn(leftovers),
    });
  }
  return grouped;
}

/** One filter option: what it means, and how many clashes it would leave with
 *  every OTHER narrowing held. A count of 0 is a dead end the bar can dim, so a
 *  control says what it will do before it is pressed. */
export type QueueOption<T> = { value: T; label: string; count: number };

/** The three independent narrowings, named by the field each one flips. */
export type QueueSwitch = 'floorMoversOnly' | 'hideNonScoring' | 'oneRungOnly';

/** Every label and every number the queue's filter bar renders (invariant #13).
 *  All counts are faceted — each option holds the rest of the filter fixed. */
export type QueueFacets = {
  classes: QueueOption<ClashClassFilter>[];
  /** `null` = anyone, then one option per candidate name. */
  participants: QueueOption<string | null>[];
  /** all · open · decided under the other narrowings — the queue's own
   *  open-vs-decided readout, which is why it is a filter and a progress line at
   *  once. */
  statuses: QueueOption<ClashStatusFilter>[];
  switches: (QueueOption<QueueSwitch> & { on: boolean })[];
  /** What the current filter shows, against the landing's whole clash count. */
  shown: number;
  total: number;
};

const CLASS_LABELS: { value: ClashClassFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'divergence', label: 'Divergence' },
  { value: 'gap', label: 'Gap' },
  { value: 'scope', label: 'Scope' },
  { value: 'grain', label: 'Grain' },
];

const STATUS_LABELS: { value: ClashStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'decided', label: 'Decided' },
];

const SWITCH_LABELS: { value: QueueSwitch; label: string }[] = [
  { value: 'floorMoversOnly', label: 'Can move the floor' },
  { value: 'hideNonScoring', label: 'Hide non-scoring' },
  { value: 'oneRungOnly', label: 'One rung apart' },
];

/** The filter with one switch flipped — the bar's press handler, kept here so a
 *  switch's field and its label never drift apart. */
export function toggleSwitch(filter: QueueFilter, key: QueueSwitch): QueueFilter {
  switch (key) {
    case 'floorMoversOnly':
      return { ...filter, floorMoversOnly: !filter.floorMoversOnly };
    case 'hideNonScoring':
      return { ...filter, hideNonScoring: !filter.hideNonScoring };
    case 'oneRungOnly':
      return { ...filter, oneRungOnly: !filter.oneRungOnly };
  }
}

/** Every count the filter bar shows, from ONE filter run per option. */
export function queueFacets(
  clashes: LandingClash[],
  workbook: Workbook,
  filter: QueueFilter,
  resolutions: ClashResolution[],
): QueueFacets {
  const count = (over: QueueFilter): number =>
    filterClashes(clashes, workbook, over, resolutions).length;
  const forcing = (key: QueueSwitch): QueueFilter => ({
    ...filter,
    floorMoversOnly: filter.floorMoversOnly || key === 'floorMoversOnly',
    hideNonScoring: filter.hideNonScoring || key === 'hideNonScoring',
    oneRungOnly: filter.oneRungOnly || key === 'oneRungOnly',
  });

  const participants: { value: string | null; label: string }[] = [
    { value: null, label: 'Anyone' },
    ...participantsOf(clashes).map((name) => ({ value: name, label: name })),
  ];

  return {
    classes: CLASS_LABELS.map((entry) => ({
      ...entry,
      count: count({ ...filter, clashClass: entry.value }),
    })),
    participants: participants.map((entry) => ({
      ...entry,
      count: count({ ...filter, participant: entry.value }),
    })),
    statuses: STATUS_LABELS.map((entry) => ({
      ...entry,
      count: count({ ...filter, status: entry.value }),
    })),
    switches: SWITCH_LABELS.map((entry) => ({
      ...entry,
      count: count(forcing(entry.value)),
      on: filter[entry.value],
    })),
    shown: count(filter),
    total: clashes.length,
  };
}

/** True when the filter narrows anything — the bar offers Clear only then.
 *  (Named for the queue: History's list has its own `isNarrowed`.) */
export function isQueueNarrowed(filter: QueueFilter): boolean {
  return (
    filter.clashClass !== 'all' ||
    filter.participant !== null ||
    filter.status !== 'all' ||
    filter.floorMoversOnly ||
    filter.hideNonScoring ||
    filter.oneRungOnly
  );
}

/** An option's accessible name: what it selects, and what it would leave. The
 *  chip itself shows the count as a bare numeral, which reads as nothing. */
export function optionName(label: string, count: number): string {
  return `${label} — ${count} clash${count === 1 ? '' : 'es'}`;
}

/** The current narrowing in one sentence — the bar's own answer to "what am I
 *  looking at, and why is it short?". The vocabulary lives here, never in
 *  markup, so every control and this line always agree. */
export function filterSummary(filter: QueueFilter, shown: number, total: number): string {
  if (!isQueueNarrowed(filter)) {
    return `Showing all ${total} clash${total === 1 ? '' : 'es'}.`;
  }

  const status = filter.status === 'open' ? 'open' : filter.status === 'decided' ? 'decided' : '';
  const words = [
    status,
    filter.clashClass === 'all' ? '' : filter.clashClass,
    shown === 1 ? 'clash' : 'clashes',
  ].filter((word) => word !== '');
  const clauses: string[] = [];
  if (filter.participant !== null) clauses.push(`${filter.participant} is party to`);
  if (filter.floorMoversOnly) clauses.push('on units that can move the estate floor');
  if (filter.oneRungOnly) clauses.push('one rung apart');

  const noun = words.join(' ');
  const narrowing = clauses.length === 0 ? noun : `${noun} ${clauses.join(', ')}`;
  const sentence = `Showing ${shown} of ${total} — ${narrowing}`;
  return filter.hideNonScoring
    ? `${sentence}. Non-scoring clashes are hidden.`
    : `${sentence}.`;
}

// Two things this module deliberately does NOT have.
//
// BULK APPLY (invariant #7). It existed, constrained to one narrowed class, and
// is gone: every clash needs a human review, and a suggestion sits on nearly
// every divergence, so "apply the suggestion to these 22" was the rubber stamp
// the constraint was meant to prevent — a filter is not a review. `Take …` on
// each card is the only way a suggestion becomes a decision.
//
// A KEYSTROKE MAP. `choiceForKey` was one and is gone: on a clash the options are
// two candidate answers, a suggestion and the rungs, so a digit could only ever
// reach the rungs — a shortcut set covering a third of the choices, with no way
// back to the previous card. `ui/card-keys.ts` still serves the ANSWERING
// surface, where the ladder is a real radiogroup and every option is reachable.

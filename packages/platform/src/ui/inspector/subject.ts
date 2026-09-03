import { z } from 'zod';
import type { Snippet } from 'svelte';
import type { Seal, Target } from '../../schema';
import { SealSchema, TargetSchema } from '../../schema';
import { targetKey } from '../../assessment';
import type { CheckId, HeatAxisId } from '../../analytics';
import type { ChipKind } from '../wheel';
import { READING_IDS, type ReadingId } from '../instrument-wheel/readings';

// The Inspector's vocabulary — what the right rail can be asked to show, and the
// only thing an inspector-aware component has to know about it.
//
// Two halves, because they have different lifetimes:
//
//  * a SELECTION is what a component picked (a wheel spoke, a question row). It
//    outlives a re-render and a reload, so it is ids only — serializable, guarded,
//    and small enough to live in history.state. Resolving it against the live
//    workbook/answers is the APP's job (the resolver seam): a dimension deleted
//    after it was picked resolves to nothing rather than to stale data.
//  * an AMBIENT subject is what the screen says the rail reads when nothing is
//    selected — a running estate reading, or a line telling you what to click. The
//    page re-declares it on every render, so it is never persisted, and its title
//    is worded by the app (one app's estate reading is "Live floor", another's is
//    "Your slice").
//
// A selection always wins over the ambient subject; that precedence is written
// once, in inspector-panel.svelte.

export type InspectSelection =
  | {
      kind: 'instrument-chip';
      /** Which axis of the instrument wheel the spoke sits on. */
      chipKind: ChipKind;
      /** The chip's key: a dimension id, a party-type id, or 'assessment'. */
      key: string;
    }
  /** One row of the instrument's readings ledger, read as what it counted. The
   *  row's id is the whole selection — the counts are re-derived from the live
   *  workbook, so a reading it no longer produces resolves to nothing. */
  | { kind: 'instrument-reading'; readingId: ReadingId }
  /** One Estate wheel axis, resolved from the live reading by its spoke key. */
  | { kind: 'estate-spoke'; key: string }
  | { kind: 'objective'; objectiveId: string }
  | {
      kind: 'question';
      questionId: string;
      /** The exact answer unit, when the rail was opened from a Landing panel
       *  (merge §4.6). Null selects the whole question. */
      target: Target | null;
    }
  /** The authored SEAL ladder. One per workbook, so it carries no id — the app
   *  resolves it against the instrument and the reading on screen. */
  | { kind: 'seal-ladder' }
  | {
      kind: 'open-units';
      /** One owner of the backlog (`party:<id>` | `dimension:<id>` | `assessment`),
       *  or null for the whole chase. */
      group: string | null;
    }
  | {
      kind: 'heat-mark';
      /** Which of the four heat grids the mark was pressed on. */
      axis: HeatAxisId;
      /** `cell:<row>:<column>` | `carry:<row>` (analytics/heat.ts heatMarkKey). */
      mark: string;
    }
  /** One offer on the Recommendations page, read as why it fired (recommendations
   *  §4.3). The card itself is resolved from the live page, so a recommendation the
   *  estate no longer fires resolves to nothing. */
  | { kind: 'recommendation'; recommendationId: string }
  /** One tread of the staircase, read as the answers pinning that rung. The rung
   *  IS its floor — one tread per level — so the level is the whole id. */
  | { kind: 'staircase-rung'; floor: Seal }
  /** Everything the estate admits it does not know, read as the questions it is
   *  admitted on. Fieldless like the ladder: there is one admitted set per
   *  reading, and the rail splits it into floor holes and the rest itself. */
  | { kind: 'dont-know' }
  /** One of the five consistency checks, read as the two facts it holds side by side
   *  and the units it invites the room to open. The check itself is derived, so one
   *  the estate no longer contradicts resolves to nothing. */
  | { kind: 'consistency-check'; checkId: CheckId }
  /** One contributor's slice of the credibility dial, read as the answers that
   *  stand because they placed them. The name is the ledger's own identity, so a
   *  contributor nothing of whose survives resolves to nothing. */
  | { kind: 'contributor'; name: string }
  /** One of Credibility's two provenance ratios, read as the units behind it. The
   *  fact is the whole id — there is one of each per reading — and it is the same
   *  word the tile marks its row with. */
  | { kind: 'provenance-fact'; fact: 'swept' | 'disputed' }
  | {
      kind: 'evidence';
      /** Every gating answer with no document behind it, read as the questions they
       *  answer — one objective's share of them, or null for all of it. */
      objectiveId: string | null;
    };

export type AmbientSubject =
  | { kind: 'estate-reading'; title: string }
  | { kind: 'hint'; title: string; text: string };

export type InspectSubject = InspectSelection | AmbientSubject;

export type InspectKind = InspectSubject['kind'];

/**
 * What an app can render for each kind of subject — the other half of the contract,
 * consumed by InspectorPanel. Each snippet receives its OWN narrowed subject, so a
 * view registered under `question` is handed the question selection and could not
 * compile against any other: the registry cannot be mis-wired, and adding a kind to
 * the union makes every app's map fail to typecheck until it decides what to do
 * about it.
 *
 * Views live in the app, not in platform, because resolving a selection's ids needs
 * the live workbook / answers / parties the shell owns. A kind with no entry falls
 * back to the panel's `hint`.
 *
 * (It lives in this .ts rather than the panel's `<script module>` because a type
 * declared there cannot be re-exported through a barrel — same reason as
 * ui/record-table/types.ts.)
 */
export type InspectorViews = {
  [K in InspectKind]?: Snippet<[Extract<InspectSubject, { kind: K }>]>;
};

/** A selection is an I/O boundary: it rides in history.state, which the sibling
 *  app shares under one key (utils/view-history.ts), so it carries its own guard. */
export const InspectSelectionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('instrument-chip'),
    chipKind: z.enum(['assessment', 'dimension', 'party']),
    key: z.string().min(1),
  }),
  z.object({
    kind: z.literal('instrument-reading'),
    readingId: z.enum(READING_IDS),
  }),
  z.object({ kind: z.literal('estate-spoke'), key: z.string().min(1) }),
  z.object({ kind: z.literal('objective'), objectiveId: z.string().min(1) }),
  z.object({
    kind: z.literal('question'),
    questionId: z.string().min(1),
    target: TargetSchema.nullable(),
  }),
  z.object({ kind: z.literal('seal-ladder') }),
  z.object({ kind: z.literal('open-units'), group: z.string().min(1).nullable() }),
  z.object({
    kind: z.literal('heat-mark'),
    axis: z.enum(['dimension', 'stratum', 'party', 'role']),
    mark: z.string().min(1),
  }),
  z.object({ kind: z.literal('recommendation'), recommendationId: z.string().min(1) }),
  z.object({ kind: z.literal('staircase-rung'), floor: SealSchema }),
  z.object({ kind: z.literal('dont-know') }),
  z.object({
    kind: z.literal('consistency-check'),
    checkId: z.enum([
      'concentration',
      'chain-visibility',
      'unserved-dimension',
      'hidden-layer',
      'undefended-claim',
    ]),
  }),
  z.object({ kind: z.literal('contributor'), name: z.string().min(1) }),
  z.object({ kind: z.literal('provenance-fact'), fact: z.enum(['swept', 'disputed']) }),
  z.object({ kind: z.literal('evidence'), objectiveId: z.string().min(1).nullable() }),
]);

export function isInspectSelection(raw: unknown): raw is InspectSelection {
  return InspectSelectionSchema.safeParse(raw).success;
}

/** Are these the same selection? Targets compare by their canonical key, never by
 *  identity — a restored selection is a fresh object. */
export function sameSelection(
  a: InspectSelection | null,
  b: InspectSelection | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'instrument-chip' && b.kind === 'instrument-chip') {
    return a.chipKind === b.chipKind && a.key === b.key;
  }
  if (a.kind === 'instrument-reading' && b.kind === 'instrument-reading') {
    return a.readingId === b.readingId;
  }
  if (a.kind === 'estate-spoke' && b.kind === 'estate-spoke') return a.key === b.key;
  if (a.kind === 'objective' && b.kind === 'objective') return a.objectiveId === b.objectiveId;
  // Fieldless: one ladder per workbook and one admitted set per reading, so
  // matching kinds ARE the same selection.
  if (a.kind === 'seal-ladder' || a.kind === 'dont-know') return true;
  if (a.kind === 'evidence' && b.kind === 'evidence') return a.objectiveId === b.objectiveId;
  if (a.kind === 'contributor' && b.kind === 'contributor') return a.name === b.name;
  if (a.kind === 'provenance-fact' && b.kind === 'provenance-fact') return a.fact === b.fact;
  if (a.kind === 'consistency-check' && b.kind === 'consistency-check') {
    return a.checkId === b.checkId;
  }
  if (a.kind === 'open-units' && b.kind === 'open-units') return a.group === b.group;
  if (a.kind === 'recommendation' && b.kind === 'recommendation') {
    return a.recommendationId === b.recommendationId;
  }
  if (a.kind === 'staircase-rung' && b.kind === 'staircase-rung') return a.floor === b.floor;
  if (a.kind === 'heat-mark' && b.kind === 'heat-mark') {
    return a.axis === b.axis && a.mark === b.mark;
  }
  if (a.kind === 'question' && b.kind === 'question') {
    if (a.questionId !== b.questionId) return false;
    if (a.target === null || b.target === null) return a.target === b.target;
    return targetKey(a.target) === targetKey(b.target);
  }
  return false;
}

/** The rail's heading for a subject. An ambient subject is titled by the screen
 *  that declared it; a selection is always the Inspector, whatever it names. */
export function inspectorTitle(subject: InspectSubject | null): string {
  if (subject === null) return 'Inspector';
  return subject.kind === 'estate-reading' || subject.kind === 'hint'
    ? subject.title
    : 'Inspector';
}

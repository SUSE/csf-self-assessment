// Load routing (pure, so it can be unit-tested without a browser). Given a parsed
// file, the current mode, and the merge-in-progress, decide what the Assessment
// app's single Load button should DO — enter a role, feed the merge, or refuse —
// together with the confirm copy for the destructive/ambiguous cases. The app
// shell (App.svelte) does the file IO and applies the outcome; all the branchy
// decision-making lives here.
//
// The model (delivery §4 UX): there is NO role switch. The FIRST load from an
// empty app sets the mode — a bare workbook opens the FACILITATOR flow, a
// workbook-assessment or saved assessment opens the FILL flow. After that,
// Load stays WITHIN the mode (facilitator: feed the merge; fill: replace the
// assessment); Reset is the only way to switch modes. The pure-core clock seam
// holds: a merge anchor's `createdAt` is passed in as `now`, never read here.
import {
  WorkbookSchema,
  WorkbookAssessmentSchema,
  AssessmentSchema,
  type Assessment,
  type Workbook,
  type WorkbookAssessment,
} from '../schema';
import { checkWorkbookAssessmentIntegrity, workbookAssessmentOf } from '../setup';
import { checkAssessmentIntegrity, type IntegrityResult } from '../assessment';
import { checkPartial } from '../merge';

export type LoadMode = 'empty' | 'facilitator' | 'fill';

// Copy for the confirm gate the shell raises before a destructive/ambiguous load.
// `null` on an outcome means apply it straight through (nothing to lose / no
// ambiguity — e.g. the first load from an empty app).
export type ConfirmCopy = { title: string; body: string; action: string };

// What Load resolves to. Every non-error outcome carries the validated payload the
// shell applies, plus its confirm (or null). Merge outcomes carry ready-to-use
// state so the shell just assigns it.
export type LoadOutcome =
  | { kind: 'error'; message: string }
  | { kind: 'fill-workbook-assessment'; wa: WorkbookAssessment; confirm: ConfirmCopy | null }
  | { kind: 'fill-assessment'; assessment: Assessment; confirm: ConfirmCopy | null }
  | { kind: 'facilitator-workbook'; workbook: Workbook; confirm: ConfirmCopy | null }
  /** A finalized assessment opened in facilitator mode: the estate of RECORD,
   *  read-only — its workbook, roster, answers and ledger become the facilitator's
   *  inspect context so the Questions rail can explain an answer from the file
   *  alone (merge.md §4.1, invariant #5). Never starts a merge. */
  | { kind: 'facilitator-finalized'; assessment: Assessment; confirm: ConfirmCopy | null }
  | { kind: 'merge-start'; wa: WorkbookAssessment; incoming: Assessment | null; confirm: ConfirmCopy | null }
  | { kind: 'merge-review'; partial: Assessment; confirm: ConfirmCopy | null };

export type LoadInput = {
  /** The parsed JSON of the opened file (the shell parses; JSON errors never reach here). */
  data: unknown;
  /** The file name, for human-readable messages. */
  name: string;
  mode: LoadMode;
  /** The merge-in-progress: its anchor, and the partial currently under review. */
  merge: { active: boolean; wa: WorkbookAssessment | null; incoming: Assessment | null };
  /** Timestamp for a derived merge anchor's createdAt (pure-core clock seam). */
  now: string;
};

function firstIssue(message: string | undefined): string {
  return message ?? 'schema error';
}

// The version-mismatch refusal, shared by every artifact that embeds a workbook.
function integrityRefusal(name: string, integrity: Extract<IntegrityResult, { ok: false }>): string {
  return `Refusing “${name}”: it records ${integrity.declared.id}@${integrity.declared.version} but carries a ${integrity.embedded.id}@${integrity.embedded.version} workbook. Version mismatches are not opened.`;
}

export function decideLoad(input: LoadInput): LoadOutcome {
  const { data, name, mode } = input;
  const wa = WorkbookAssessmentSchema.safeParse(data);
  const assessment = AssessmentSchema.safeParse(data);
  const workbook = WorkbookSchema.safeParse(data);

  const replaceAssessment: ConfirmCopy = {
    title: 'Replace your assessment?',
    body: `Load “${name}”? Your current answers are stored only in this browser — export them first if you want to keep them.`,
    action: 'Discard & load',
  };
  const startMergeConfirm = (what: string): ConfirmCopy => ({
    title: 'Start merging?',
    body: `“${name}” is ${what}. Start merging returned partials? To fill it in as a participant instead, Reset the app first.`,
    action: 'Start merge',
  });

  // --- FACILITATOR: Load feeds this flow; it never switches to the FILL flow. --------
  if (mode === 'facilitator') {
    // A workbook-assessment → start a merge anchored on it (confirm the intent).
    if (wa.success) {
      const integrity = checkWorkbookAssessmentIntegrity(wa.data);
      if (!integrity.ok) return { kind: 'error', message: integrityRefusal(name, integrity) };
      return { kind: 'merge-start', wa: wa.data, incoming: null, confirm: startMergeConfirm('a workbook-assessment') };
    }
    // A returned partial → put it under review, or start a merge from it (a
    // partial is self-sufficient: its embedded workbook + workbook-assessment id
    // derive the anchor). One partial is under review at a time (merge.md §2.1.3).
    if (assessment.success && assessment.data.meta.participant !== undefined) {
      const partial = assessment.data;
      if (input.merge.active && input.merge.wa) {
        const under = input.merge.incoming?.meta.participant;
        if (under !== undefined) {
          return {
            kind: 'error',
            message: `“${name}” can’t go under review: ${under.name}’s partial is still under review — land or discard it first.`,
          };
        }
        const check = checkPartial(input.merge.wa, partial);
        if (!check.ok) return { kind: 'error', message: `“${name}” can’t be added to the merge: ${check.reason}.` };
        return {
          kind: 'merge-review',
          partial,
          confirm: { title: 'Add to the merge?', body: `Put the returned partial “${name}” under review?`, action: 'Add partial' },
        };
      }
      const anchor = workbookAssessmentOf({
        workbook: partial.workbook,
        estate: partial.meta.estate,
        parties: partial.parties,
        id: partial.meta.workbookAssessment,
        createdAt: input.now,
      });
      const check = checkPartial(anchor, partial);
      if (!check.ok) return { kind: 'error', message: `“${name}” can’t start a merge: ${check.reason}.` };
      return { kind: 'merge-start', wa: anchor, incoming: partial, confirm: startMergeConfirm('a returned partial') };
    }
    // A bare workbook → replace the instrument being prepared (same mode).
    if (workbook.success) {
      return {
        kind: 'facilitator-workbook',
        workbook: workbook.data,
        confirm: { title: 'Replace the workbook?', body: `Load “${name}” as the workbook to prepare? Your current setup here will be discarded.`, action: 'Replace' },
      };
    }
    // A finalized assessment is the estate of RECORD: opened read-only so the
    // Questions rail can explain it. Anything else is junk.
    if (assessment.success) {
      const integrity = checkAssessmentIntegrity(assessment.data);
      if (!integrity.ok) return { kind: 'error', message: integrityRefusal(name, integrity) };
      return {
        kind: 'facilitator-finalized',
        assessment: assessment.data,
        confirm: {
          title: 'Open the finalized assessment?',
          body: `“${name}” is a finalized assessment. Open it as the estate of record? Any merge in progress here will be closed.`,
          action: 'Open finalized',
        },
      };
    }
    return { kind: 'error', message: `“${name}” is not a workbook, workbook-assessment, or partial: ${firstIssue(workbook.error.issues[0]?.message)}.` };
  }

  // --- EMPTY or FILL: workbook-assessment/assessment fill; a workbook is a mode switch. ---
  if (wa.success) {
    const integrity = checkWorkbookAssessmentIntegrity(wa.data);
    if (!integrity.ok) return { kind: 'error', message: integrityRefusal(name, integrity) };
    return { kind: 'fill-workbook-assessment', wa: wa.data, confirm: mode === 'fill' ? replaceAssessment : null };
  }
  if (assessment.success) {
    const integrity = checkAssessmentIntegrity(assessment.data);
    if (!integrity.ok) return { kind: 'error', message: integrityRefusal(name, integrity) };
    return { kind: 'fill-assessment', assessment: assessment.data, confirm: mode === 'fill' ? replaceAssessment : null };
  }
  if (workbook.success) {
    // A bare workbook opens the facilitator flow. From empty that's the first load;
    // from fill mode it's a MODE SWITCH, which requires a Reset first.
    if (mode === 'fill')
      return { kind: 'error', message: `“${name}” is a workbook, which starts Facilitator mode. Reset the app first to switch from filling in an assessment.` };
    return { kind: 'facilitator-workbook', workbook: workbook.data, confirm: null };
  }

  // None matched: surface the specific error from the shape it most resembles.
  const looksLikeAssessment = typeof data === 'object' && data !== null && 'answers' in data;
  return {
    kind: 'error',
    message: looksLikeAssessment
      ? `“${name}” is not a valid assessment: ${firstIssue(assessment.error.issues[0]?.message)}.`
      : `“${name}” is not a valid workbook or workbook-assessment: ${firstIssue(workbook.error.issues[0]?.message)}.`,
  };
}

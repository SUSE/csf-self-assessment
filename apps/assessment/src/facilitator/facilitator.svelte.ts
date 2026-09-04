// The FACILITATOR persona: the author's workbook imported, then
// walked left to right — inspect, seed, export the workbook-assessment, land the
// returned partials, read the estate. The MERGE is a member rather than a peer
// because every inspect page resolves THROUGH it (see the readings below).
import {
  assessmentOf,
  defaultParties,
  evaluate,
  isTileId,
  workbookAssessmentOf,
  NO_HISTORY_VIEW,
} from '@csf/platform';
import type { Answer, Assessment, Landing, Party, TileId, Workbook } from '@csf/platform';
import { saveJsonFile } from '@csf/platform/file-io';
import { facilitatorState, type FacilitatorState } from '@csf/platform/facilitator-storage';
import {
  FACILITATOR_SECTIONS,
  isFacilitatorSection,
  type FacilitatorSection,
} from '@csf/platform/ui/facilitator-toolbar';
import type { InspectorSession } from '@csf/platform/ui/inspector';
import { nowInstant } from '../clock';
import { Merge } from './merge.svelte';

// What the facilitator is showing INSTEAD of the section (report.md §4.1). One
// field rather than a flag per destination, so two can never be open at once.
export type FacilitatorOverlay = { kind: 'recommendations' };

export class Facilitator {
  // Declared first: a class field initializer cannot reference a later field.
  readonly merge = new Merge();
  readonly #inspector: InspectorSession;

  workbook = $state<Workbook | null>(null);
  estate = $state('');
  // EstateSetup is controlled, so the Parties section reflects this same list.
  parties = $state<Party[]>([]);
  // Adopted when a partial/finalized was imported directly; empty otherwise.
  answers = $state<Answer[]>([]);
  // An imported FINALIZED's ledger. A live merge owns its own.
  ledger = $state<Landing[]>([]);
  workbookAssessmentId = $state<string | null>(null);

  section = $state<FacilitatorSection>('overview');
  maximisedTile = $state<TileId | null>(null);
  // The destination shown in place of the section, or null for the section.
  overlay = $state<FacilitatorOverlay | null>(null);
  // A live PRINT request: the instant the shell stamped when Report was pressed,
  // or null when none is in flight. Never a view, so never persisted.
  reportGeneratedAt = $state<string | null>(null);

  // This persona is the one rendered — the loaded ARTIFACT decides, there is no
  // role switch.
  active = $derived(this.workbook !== null);

  // Once the merge anchor exists Setup is behind us, so its tab drops out.
  sections = $derived<FacilitatorSection[]>(
    this.merge.workbookAssessment !== null
      ? FACILITATOR_SECTIONS.filter((s) => s !== 'setup')
      : [...FACILITATOR_SECTIONS],
  );

  // What the INSPECT pages read. A merge in progress IS a loaded assessment — its
  // anchor and estate base become the context, so Questions shows the SEAL each one
  // was answered at as partials land. With no merge, a directly imported artifact
  // (or the bare workbook, whose empty answers mean no seals).
  inspectWorkbook = $derived<Workbook | null>(this.merge.workbookAssessment?.workbook ?? this.workbook);
  inspectAnswers = $derived<Answer[]>(
    this.merge.landed && this.merge.base ? this.merge.base.answers : this.answers,
  );
  inspectParties = $derived<Party[]>(
    this.merge.landed && this.merge.base ? this.merge.base.parties : this.parties,
  );
  inspectLedger = $derived<Landing[]>(this.merge.landed ? this.merge.ledger : this.ledger);

  // The dashboard's input: the live merge's estate of record, else a directly
  // imported finalized, else nothing has landed yet.
  estateAssessment = $derived<Assessment | null>(
    this.merge.finalized ??
      (this.workbook && this.workbookAssessmentId !== null && this.answers.length > 0
        ? assessmentOf(this.workbook, this.estate, this.parties, this.answers, {
            kind: 'finalized',
            workbookAssessment: this.workbookAssessmentId,
            ledger: this.ledger,
          })
        : null),
  );
  result = $derived(
    this.estateAssessment
      ? evaluate(this.estateAssessment.workbook, this.estateAssessment)
      : null,
  );

  constructor(restored: FacilitatorState | null, section: unknown, inspector: InspectorSession) {
    this.#inspector = inspector;
    this.merge.restore(restored?.merge);
    if (restored) {
      this.workbook = restored.workbook;
      this.estate = restored.estate;
      this.parties = restored.parties;
      this.answers = restored.answers;
      this.ledger = restored.ledger;
      this.workbookAssessmentId = restored.workbookAssessment;
      if (isTileId(restored.maximised)) this.maximisedTile = restored.maximised;
    }
    if (isFacilitatorSection(section)) this.section = section;
    // Mirror on every change. Nothing imported → cleared, which is
    // also how an import overrides what a previous one stored.
    $effect(() => {
      if (this.workbook) {
        facilitatorState.store({
          kind: 'facilitator',
          workbook: this.workbook,
          estate: this.estate,
          parties: this.parties,
          answers: this.answers,
          ledger: this.ledger,
          section: this.section,
          workbookAssessment: this.workbookAssessmentId,
          maximised: this.maximisedTile,
          merge: this.merge.persisted(),
        });
      } else {
        facilitatorState.clear();
      }
    });
  }

  // Leave the persona entirely — exactly one context is ever live. The store
  // $effect clears the stored copy for free.
  clear(): void {
    this.workbook = null;
    this.estate = '';
    this.parties = [];
    this.answers = [];
    this.ledger = [];
    this.workbookAssessmentId = null;
    this.section = 'overview';
    this.maximisedTile = null;
    this.overlay = null;
    this.#inspector.clear();
    this.merge.reset();
  }

  // Import a bare workbook: seed the default roster and start the walk.
  enter(workbook: Workbook): void {
    this.clear();
    this.workbook = workbook;
    this.parties = defaultParties(workbook);
  }

  // The estate of RECORD, read-only: its embedded workbook, roster, answers and
  // ledger become the inspect context. Never starts a merge.
  enterFinalized(assessment: Assessment): void {
    this.clear();
    this.workbook = assessment.workbook;
    this.estate = assessment.meta.estate;
    this.parties = assessment.parties;
    this.answers = assessment.answers;
    this.ledger = assessment.ledger;
    this.workbookAssessmentId = assessment.meta.workbookAssessment;
    this.section = 'questions';
  }

  // Moving section drops the selection: each page inspects its own things, so a
  // carried subject would strand in the rail with no control to match it.
  goToSection(section: FacilitatorSection): void {
    this.section = section;
    this.overlay = null;
    this.#inspector.clear();
    if (section === 'merge') this.merge.history = null;
  }

  // The vendor page. Idempotent, like the merge ledger's: pressing it while it is
  // open keeps showing it, and Dashboard beside it is the way back.
  openRecommendations(): void {
    this.overlay = { kind: 'recommendations' };
  }

  // Print the Report over the estate of record — a request, not a view: the
  // facilitator stays on the section they were reading. `at` is `nowInstant()`,
  // stamped by the caller, since this class never reads the clock.
  printReport(at: string): void {
    this.reportGeneratedAt = at;
  }

  // The landing ledger, from wherever it was pressed. It renders inside the Merge
  // section, so opening it MOVES there — that is the destination, not a detour.
  // Idempotent: pressing it while open keeps showing it, and Merge is the way
  // back to the review. Not `goToSection('merge')`, which clears the history.
  openHistory(): void {
    this.section = 'merge';
    this.overlay = null;
    this.#inspector.clear();
    if (this.merge.history === null) this.merge.history = NO_HISTORY_VIEW;
  }

  // Show one question in the rail, wherever it was named from.
  inspectQuestion(questionId: string): void {
    this.#inspector.show({ kind: 'question', questionId, target: null });
    this.overlay = null;
    this.section = 'questions';
  }

  // The clock is stamped here — the pure core never reads it.
  async exportWorkbookAssessment(estate: string, seeded: Party[]): Promise<void> {
    const workbook = this.workbook;
    if (!workbook) return;
    const createdAt = nowInstant();
    await saveJsonFile(
      `${workbook.meta.id}-workbook-assessment.json`,
      workbookAssessmentOf({ workbook, estate, parties: seeded, id: `wa-${createdAt}`, createdAt }),
    );
  }
}

export function createFacilitator(
  restored: FacilitatorState | null,
  section: unknown,
  inspector: InspectorSession,
): Facilitator {
  return new Facilitator(restored, section, inspector);
}

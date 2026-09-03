// The MERGE in progress (merge.md): the estate base, the ledger of Landings, and
// the ONE partial under review with the decisions taken on it. Landing is atomic —
// a refused Land writes nothing — so the refusal lives here rather than on the
// shell's error line, where someone else would have to clear it.
import {
  NO_HISTORY_VIEW,
  finalizeLanded,
  land,
  landingChecks,
  landingRefusalMessage,
  reviewLanding,
  reviewSummary,
  upsertPartyDecision,
  upsertResolution,
} from '@csf/platform';
import type {
  Assessment,
  ClashResolution,
  EstateBase,
  HistoryView,
  Landing,
  PartyDecision,
  RecordRef,
  WorkbookAssessment,
} from '@csf/platform';
import { saveJsonFile } from '@csf/platform/file-io';
import type { FacilitatorState } from '@csf/platform/facilitator-storage';
import { nowInstant } from '../clock';

type PersistedMerge = NonNullable<FacilitatorState['merge']>;

export class Merge {
  /** The anchor every landing is reconciled against. */
  workbookAssessment = $state<WorkbookAssessment | null>(null);
  /** Everything landed so far. Not an assessment — no floor, no score. */
  base = $state<EstateBase | null>(null);
  ledger = $state<Landing[]>([]);
  /** One partial under review at a time (§2.1.3), and its decisions. */
  incoming = $state<Assessment | null>(null);
  resolutions = $state<ClashResolution[]>([]);
  partyDecisions = $state<PartyDecision[]>([]);
  /** Frozen into the Landing envelope on Land (landing-history §2.6). */
  note = $state('');
  /** The History reading position; null = the Review is open. Never persisted with
   *  the estate (landing-history §3.3.2). */
  history = $state<HistoryView | null>(null);
  /** Transient — a refusal is not state. */
  refusal = $state<string | null>(null);

  active = $derived(this.workbookAssessment !== null && this.base !== null);
  /** Something has actually landed — what makes the estate readable. */
  landed = $derived(this.base !== null && this.base.answers.length > 0);

  /** Null while nothing is under review — the merge screen shows Add partial then. */
  review = $derived(
    this.base && this.incoming
      ? reviewLanding(this.base, this.ledger, this.incoming, this.partyDecisions)
      : null,
  );
  summary = $derived(this.review ? reviewSummary(this.review, this.resolutions) : null);
  checks = $derived(
    this.workbookAssessment && this.base && this.review
      ? landingChecks(this.workbookAssessment, this.base, this.review, this.resolutions)
      : null,
  );

  /** A partially decided landing is never exported. */
  canExportFinal = $derived(
    this.workbookAssessment !== null && this.ledger.length > 0 && this.incoming === null,
  );

  /** The estate of record as it stands — what the dashboard reads. */
  finalized = $derived(
    this.workbookAssessment && this.base
      ? finalizeLanded(this.workbookAssessment, this.base, this.ledger)
      : null,
  );

  /** A method rather than a constructor argument so Facilitator can initialise this
   *  at its DECLARATION — a class field cannot reference a later one. */
  restore(restored: PersistedMerge | null | undefined): void {
    if (!restored) return;
    this.workbookAssessment = restored.workbookAssessment;
    this.base = restored.base;
    this.ledger = restored.ledger;
    this.incoming = restored.incoming;
    this.resolutions = restored.resolutions;
    this.partyDecisions = restored.partyDecisions;
    this.note = restored.note;
  }

  /** What the facilitator store writes, or null when there is nothing to resume. */
  persisted(): PersistedMerge | null {
    const workbookAssessment = this.workbookAssessment;
    const base = this.base;
    if (!workbookAssessment || !base) return null;
    return {
      workbookAssessment,
      base,
      ledger: this.ledger,
      incoming: this.incoming,
      resolutions: this.resolutions,
      partyDecisions: this.partyDecisions,
      note: this.note,
    };
  }

  /** A fresh import drops any merge built against the previous workbook. */
  reset(): void {
    this.workbookAssessment = null;
    this.base = null;
    this.ledger = [];
    this.note = '';
    this.history = null;
    this.#clearReview();
  }

  start(workbookAssessment: WorkbookAssessment, incoming: Assessment | null): void {
    this.workbookAssessment = workbookAssessment;
    this.base = { parties: workbookAssessment.parties, answers: [] };
    this.ledger = [];
    this.#clearReview();
    this.incoming = incoming;
  }

  receive(partial: Assessment): void {
    this.#clearReview();
    this.incoming = partial;
  }

  resolve(resolution: ClashResolution): void {
    this.resolutions = upsertResolution(this.resolutions, resolution);
  }

  decide(decision: PartyDecision): void {
    this.partyDecisions = upsertPartyDecision(this.partyDecisions, decision);
  }

  /** Send the partial back unlanded — nothing it proposed is kept. */
  discard(): void {
    this.#clearReview();
    this.note = '';
  }

  /** Commit onto the base (merge.md §2.1.2). The identity and clock are stamped
   *  here — the pure core reads neither (invariant #3). A refusal writes nothing. */
  land(): void {
    const base = this.base;
    const incoming = this.incoming;
    if (!base || !incoming) return;
    const outcome = land(
      base,
      this.ledger,
      incoming,
      { resolutions: this.resolutions, partyDecisions: this.partyDecisions },
      { id: crypto.randomUUID(), at: nowInstant(), note: this.note },
    );
    if (!outcome.ok) {
      this.refusal = landingRefusalMessage(outcome.refusal);
      return;
    }
    this.refusal = null;
    this.base = outcome.base;
    this.ledger = outcome.ledger;
    this.#clearReview();
    this.note = '';
  }

  selectRecord(ref: RecordRef | null): void {
    this.history = {
      ...(this.#historyBase()),
      record: ref === null ? null : $state.snapshot(ref),
    };
  }

  /** Same screen, so it replaces rather than pushing — pushing is the router's
   *  `openLanding`. */
  openNeighbor(id: string): void {
    this.history = { ...this.#historyBase(), landing: id, record: null };
  }

  async exportFinalized(): Promise<void> {
    const wa = this.workbookAssessment;
    const finalized = this.finalized;
    if (!wa || !finalized) return;
    await saveJsonFile(`${wa.meta.workbookId}-finalized.json`, finalized);
  }

  /** A plain object for the History API — a $state proxy throws DataCloneError. */
  historySnapshot(): HistoryView | null {
    return $state.snapshot(this.history);
  }

  #historyBase(): HistoryView {
    return $state.snapshot(this.history) ?? NO_HISTORY_VIEW;
  }

  #clearReview(): void {
    this.incoming = null;
    this.resolutions = [];
    this.partyDecisions = [];
    this.refusal = null;
  }
}

// The FILL persona (CONTEXT §Delivery): one participant and their partial. It owns
// the participant store as well (invariant #7 — the browser copy IS the work), so
// the mirror can't drift from what it mirrors.
import {
  assessmentOf,
  claimVisibleParties,
  claimWalk,
  evaluate,
  fullWalk,
} from '@csf/platform';
import type {
  Answer,
  Assessment,
  AssessmentProvenance,
  Claim,
  Landing,
  Participant,
  Party,
  TileId,
  Workbook,
  WorkbookAssessment,
} from '@csf/platform';
import { ASSESSMENT_SECTIONS, type AssessmentSection } from '@csf/platform/ui/assessment-toolbar';
import { saveJsonFile } from '@csf/platform/file-io';
import { participantState, type ParticipantState } from '@csf/platform/participant-storage';
import type { StageView } from '../stage-view';

type RestoredView = Extract<StageView, { stage: 'fill' }> | null;

export type FillMode = Extract<StageView, { stage: 'fill' }>['view'];

export class Fill {
  workbook = $state<Workbook | null>(null);
  estate = $state<string | null>(null);
  /** Seeded (shared ids, read-only here) vs this participant's own additions —
   *  apart because only the second set is theirs to edit. */
  parties = $state<Party[]>([]);
  partiesAdded = $state<Party[]>([]);
  answers = $state<Answer[]>([]);
  claims = $state<Claim[]>([]);
  /** -1 = no claim active, so Questions is closed. */
  activeClaimIndex = $state(-1);
  /** A workbook-assessment is adopted straight into a PARTIAL — the id AND a
   *  participant whose name may still be blank (delivery §2.2). A finalized carries
   *  the id and a ledger but no participant. */
  workbookAssessmentId = $state<string | null>(null);
  participant = $state<Participant | null>(null);
  ledger = $state<Landing[]>([]);

  /** View state — restored from history.state, not from the store. Read is the
   *  dashboard; recommendations is the vendor page reached from the toolbar. */
  mode = $state<FillMode>('fill');
  section = $state<AssessmentSection>('overview');
  focusId = $state<string | null>(null);
  maximisedTile = $state<TileId | null>(null);
  /** A live PRINT request: the instant the shell stamped when Report was pressed,
   *  or null when none is in flight. The pure module never reads the clock
   *  (invariant #7), so the value arrives from the caller. Never a view, so never
   *  persisted — the document mounts off-screen only while this is set. */
  reportGeneratedAt = $state<string | null>(null);
  /** null → the list; a null id/index → composing a new one. Never persisted. */
  claimEdit = $state<{ index: number | null } | null>(null);
  partyEdit = $state<{ id: string | null } | null>(null);

  allParties = $derived<Party[]>([...this.parties, ...this.partiesAdded]);

  provenance = $derived<AssessmentProvenance | null>(
    this.workbookAssessmentId === null
      ? null
      : this.participant !== null
        ? {
            kind: 'partial',
            workbookAssessment: this.workbookAssessmentId,
            participant: this.participant,
            claims: this.claims,
            partiesAdded: this.partiesAdded,
          }
        : { kind: 'finalized', workbookAssessment: this.workbookAssessmentId, ledger: this.ledger },
  );

  loaded = $derived(this.workbook !== null && this.estate !== null);
  isFinalized = $derived(this.provenance?.kind === 'finalized');
  /** A partial, actively filling — the only stage with the sectioned toolbar. */
  answering = $derived(this.loaded && !this.isFinalized);

  /** The single engine result (invariant #3). */
  result = $derived(
    this.workbook && this.estate !== null && this.provenance
      ? evaluate(
          this.workbook,
          assessmentOf(this.workbook, this.estate, this.allParties, this.answers, this.provenance),
        )
      : null,
  );

  /** Everything for a finalized, the active claim's slice while filling. */
  sections = $derived(
    this.workbook === null
      ? []
      : this.isFinalized
        ? fullWalk(this.workbook)
        : this.activeClaimIndex >= 0
          ? claimWalk(this.workbook, this.allParties, this.claims[this.activeClaimIndex])
          : [],
  );

  /** The party-axis twin of claimWalk's narrowing: the active claim's chips only
   *  (delivery §2.3.3). */
  walkParties = $derived(
    this.workbook === null || this.participant === null || this.activeClaimIndex < 0
      ? this.allParties
      : claimVisibleParties(this.allParties, this.claims[this.activeClaimIndex]),
  );

  /** The active claim's role(s) — the same primary line the Claims list leads with. */
  activeClaimLabel = $derived.by<string | null>(() => {
    const wb = this.workbook;
    if (wb === null || this.activeClaimIndex < 0) return null;
    const claim = this.claims[this.activeClaimIndex];
    if (claim === undefined) return null;
    const roles = claim.roles.map((id) => wb.roles.find((r) => r.id === id)?.name ?? id).join(', ');
    return roles === '' ? 'Claim' : roles;
  });

  /** The walk's question ids — what the Questions index lists. */
  walkQuestionIds = $derived(this.sections.flatMap((s) => s.questions.map((q) => q.id)));

  /** Resolved against the active walk, so the toolbar's nav and the fill surface's
   *  auto-advance stay in lockstep. */
  resolvedFocusId = $derived.by<string | null>(() => {
    const all = this.sections.flatMap((s) => s.questions);
    return this.focusId !== null && all.some((q) => q.id === this.focusId)
      ? this.focusId
      : (all[0]?.id ?? null);
  });

  /** Questions answers the active claim, so a stale or restored view pointing there
   *  with none active lands on Claims to pick one, not on an empty surface. */
  activeSection = $derived<AssessmentSection>(
    !ASSESSMENT_SECTIONS.includes(this.section)
      ? 'overview'
      : this.section === 'questions' && this.activeClaimIndex < 0
        ? 'claims'
        : this.section,
  );

  /** A partial identifies its submitter, so the name gates EXPORT only — it stays
   *  optional while filling. */
  needsName = $derived(this.participant !== null && this.participant.name.trim().length === 0);

  constructor(restored: ParticipantState | null, view: RestoredView) {
    if (restored) {
      const a = restored.assessment;
      this.workbook = a.workbook;
      this.estate = a.meta.estate;
      this.parties = a.parties;
      this.partiesAdded = a.partiesAdded ?? [];
      this.answers = a.answers;
      this.ledger = a.ledger;
      this.workbookAssessmentId = a.meta.workbookAssessment ?? null;
      this.participant = a.meta.participant ?? null;
      this.claims = a.claims ?? [];
      this.activeClaimIndex = (a.claims ?? []).length - 1;
    }
    if (view) {
      this.mode = view.view;
      this.section = view.section;
      this.focusId = view.focus;
      this.maximisedTile = view.maximised;
    }
    // Mirror on every change, so a refresh resumes exactly (invariant #7).
    $effect(() => {
      if (this.workbook && this.estate !== null && this.provenance) {
        participantState.store({
          kind: 'assessment',
          assessment: assessmentOf(
            this.workbook,
            this.estate,
            this.parties,
            this.answers,
            this.provenance,
          ),
        });
      } else {
        participantState.clear();
      }
    });
  }

  /** Everything a fresh load resets, so the entry points can't drift apart. */
  #reset(): void {
    this.parties = [];
    this.partiesAdded = [];
    this.answers = [];
    this.claims = [];
    this.activeClaimIndex = -1;
    this.ledger = [];
    this.mode = 'fill';
    this.reportGeneratedAt = null;
    this.section = 'overview';
    this.maximisedTile = null;
    this.claimEdit = null;
    this.partyEdit = null;
    this.focusId = null;
  }

  /** Leave the persona entirely — exactly one context is ever live. The store
   *  $effect clears the stored copy for free. */
  clear(): void {
    this.#reset();
    this.workbook = null;
    this.estate = null;
    this.workbookAssessmentId = null;
    this.participant = null;
  }

  enterFromWorkbookAssessment(wa: WorkbookAssessment): void {
    this.#reset();
    this.workbook = wa.workbook;
    this.estate = wa.meta.estate;
    this.parties = wa.parties;
    this.workbookAssessmentId = wa.meta.id;
    this.participant = { name: '' };
  }

  /** No participant ⇒ finalized ⇒ it opens in Read. */
  enterFromAssessment(a: Assessment): void {
    this.#reset();
    this.workbook = a.workbook;
    this.estate = a.meta.estate;
    this.parties = a.parties;
    this.partiesAdded = a.partiesAdded ?? [];
    this.answers = a.answers;
    this.ledger = a.ledger;
    this.workbookAssessmentId = a.meta.workbookAssessment;
    this.participant = a.meta.participant ?? null;
    this.claims = a.claims ?? [];
    this.activeClaimIndex = (a.claims ?? []).length - 1;
    this.mode = a.meta.participant == null ? 'read' : 'fill';
  }

  /** The active claim's questions grouped by objective, and back to the surface. */
  toggleQuestionsIndex(): void {
    this.mode = this.mode === 'questions-index' ? 'fill' : 'questions-index';
  }

  /** The dashboard read-back; the way back is any section beside it. */
  openRead(): void {
    this.mode = 'read';
  }

  /** The vendor page, and the way back to the answers is any section beside it. */
  openRecommendations(): void {
    this.mode = 'recommendations';
  }

  /** Print the Report over this estate — the reader stays on whatever they were
   *  reading. `at` is `nowInstant()`, stamped by the caller. */
  printReport(at: string): void {
    this.reportGeneratedAt = at;
  }

  /** From a dashboard tile or a recommendation's evidence: switch to the claim covering it (one outside every
   *  claim stays where it is), then focus it. */
  openQuestion(id: string): void {
    const wb = this.workbook;
    const covering =
      wb === null
        ? -1
        : this.claims.findIndex((claim) =>
            claimWalk(wb, this.allParties, claim).some((s) => s.questions.some((q) => q.id === id)),
          );
    if (covering >= 0) this.activeClaimIndex = covering;
    this.focusId = id;
    this.section = 'questions';
    this.mode = 'fill';
  }

  /** Moving section leaves whichever editor was open behind it. */
  goToSection(section: AssessmentSection): void {
    this.section = section;
    this.claimEdit = null;
    this.partyEdit = null;
    this.mode = 'fill';
  }

  selectClaim(index: number): void {
    this.activeClaimIndex = index;
    this.focusId = null;
  }

  saveClaim(claim: Claim): void {
    const edit = this.claimEdit;
    if (edit === null) return;
    if (edit.index === null) {
      this.claims = [...this.claims, claim];
      this.activeClaimIndex = this.claims.length - 1;
    } else {
      this.claims = this.claims.map((c, i) => (i === edit.index ? claim : c));
      this.activeClaimIndex = edit.index;
    }
    this.focusId = null;
    this.claimEdit = null;
  }

  // verbatim exception — removing a claim never deletes answers (delivery §2.3.4,
  // invariant #3); the index math keeps the active claim valid after the splice.
  removeClaim(index: number): void {
    this.claims = this.claims.filter((_, i) => i !== index);
    this.activeClaimIndex =
      this.claims.length === 0
        ? -1
        : index < this.activeClaimIndex
          ? this.activeClaimIndex - 1
          : Math.min(this.activeClaimIndex, this.claims.length - 1);
    this.focusId = null;
  }

  /** Replace by id, so a claim naming the party still resolves. */
  saveParty(party: Party): void {
    const edit = this.partyEdit;
    if (edit === null) return;
    this.partiesAdded =
      edit.id === null
        ? [...this.partiesAdded, party]
        : this.partiesAdded.map((p) => (p.id === edit.id ? party : p));
    this.partyEdit = null;
  }

  removeParty(id: string): void {
    this.partiesAdded = this.partiesAdded.filter((p) => p.id !== id);
  }

  /** An EXPORT, not a save — the work is already mirrored to local storage. This is
   *  the shareable artifact, what the facilitator lands. */
  async exportPartial(): Promise<void> {
    if (!this.workbook || this.estate === null || this.participant === null) return;
    if (this.needsName || !this.provenance) return;
    await saveJsonFile(
      `${this.workbook.meta.id}-partial-${this.participant.name}.json`,
      assessmentOf(this.workbook, this.estate, this.parties, this.answers, this.provenance),
    );
  }
}

export function createFill(restored: ParticipantState | null, view: RestoredView): Fill {
  return new Fill(restored, view);
}

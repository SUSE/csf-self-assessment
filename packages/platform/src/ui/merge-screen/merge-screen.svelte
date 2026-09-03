<script lang="ts">
  import type {
    ClashResolution,
    EstateBase,
    Landing,
    PartyDecision,
    Target,
    WorkbookAssessment,
  } from '../../schema';
  import type {
    HistoryView,
    LandingChecks as LandingChecksModel,
    LandingReview,
    RecordRef,
    ReviewSummary,
    Viewer,
  } from '../../merge';
  import { canLand, isClash } from '../../merge';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { LandingChecks } from '../landing-checks';
  import { LandingHeader } from '../landing-header';
  import { MergeWheel, mergeWheelModel } from '../merge-wheel';
  import { ConflictQueue } from '../conflict-queue';
  import { PartyReconcileQueue } from '../party-reconcile';
  import LandingHistory from './landing-history.svelte';

  // The facilitator's Merge section (merge.md): Review — one partial under
  // review at a time, every clash decided before it lands — and History, the
  // append-only ledger. Owns NO merge state; the app shell holds the base, the
  // ledger and the decisions, and does the file I/O.
  type Props = {
    workbookAssessment: WorkbookAssessment;
    base: EstateBase;
    ledger: Landing[];
    review: LandingReview | null;
    summary: ReviewSummary | null;
    checks: LandingChecksModel | null;
    incomingName: string | null;
    resolutions: ClashResolution[];
    partyDecisions: PartyDecision[];
    note: string;
    history: HistoryView | null;
    viewer: Viewer;
    selected: RecordRef | null;
    onNote: (value: string) => void;
    onSelectRecord: (ref: RecordRef | null) => void;
    onOpenNeighbor: (id: string) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
    onHistory: (view: HistoryView | null) => void;
    onOpenLanding: (id: string, scroll: number) => void;
    onAddPartial: () => void;
    onResolve: (resolution: ClashResolution) => void;
    onDecide: (decision: PartyDecision) => void;
    onLand: () => void;
    onDiscard: () => void;
  };
  let {
    workbookAssessment,
    base,
    ledger,
    review,
    summary,
    checks,
    incomingName,
    resolutions,
    partyDecisions,
    note,
    history,
    viewer,
    selected,
    onNote,
    onSelectRecord,
    onOpenNeighbor,
    onOpenQuestion,
    onHistory,
    onOpenLanding,
    onAddPartial,
    onResolve,
    onDecide,
    onLand,
    onDiscard,
  }: Props = $props();

  const mayLand = $derived(summary === null ? false : canLand(summary));

  const clashes = $derived(review?.units.filter(isClash) ?? []);
  // ONE coverage model, shared by the wheel AND its text summary so the two
  // never disagree. A clash's unit is not yet landed, so it reads as
  // outstanding until it is decided.
  const cov = $derived(
    mergeWheelModel({
      workbook: workbookAssessment.workbook,
      parties: base.parties,
      answers: base.answers,
      clashes,
    }),
  );
</script>

<div class="space-y-6">
  <div class="space-y-1">
    <h2 class="text-lg font-semibold text-foreground">Merge partials</h2>
    <p class="text-sm text-muted-foreground">
      {workbookAssessment.meta.estate} · {workbookAssessment.meta.id} ·
      {workbookAssessment.meta.workbookId}@{workbookAssessment.meta.workbookVersion}
    </p>
  </div>

  <!-- Review / History is NOT a button pair in the stage body: the two are header
       destinations in the facilitator's stage header (ui/facilitator-toolbar) —
       History shows the ledger, Merge comes back to the review — where the app owns
       them and can hide History until a landing exists. `onHistory` is still a prop
       because the ledger view navigates within itself. -->
  {#if history === null}
    {#if review !== null && summary !== null && incomingName !== null}
      <LandingHeader
        name={incomingName}
        {summary}
        {note}
        {onNote}
        canLand={mayLand}
        {onLand}
        {onDiscard}
      />
      {#if checks !== null}
        <LandingChecks
          {checks}
          incomingName={incomingName ?? ''}
          collisions={summary.collisions}
        />
      {/if}
      <PartyReconcileQueue
        {workbookAssessment}
        pairs={review.pairs}
        additions={review.additions}
        parties={review.parties}
        decisions={partyDecisions}
        participantName={incomingName ?? ''}
        {onDecide}
      />
      <ConflictQueue
        {workbookAssessment}
        {clashes}
        {resolutions}
        incomingName={incomingName ?? ''}
        {onResolve}
      />
    {:else}
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">Nothing under review.</p>
        <Button variant="outline" onclick={onAddPartial} aria-label="Add partial">Add partial</Button>
      </div>
    {/if}

    <!-- Coverage at a glance: each estate chip (a dimension, a concrete provider,
         the whole estate) fills hub→rim with how much of it has landed, so the
         facilitator watches it fill and sees which axes still have gaps. -->
    <!-- A Panel, like every other section of the Merge review. The wheel used to
         carry its own card box inside this one; the panel is that box now. -->
    <!-- "before merge": this wheel reads the estate base as it stands, with the
         landing under review counted as still outstanding. The AFTER number
         already exists one panel up — Landing checks' `Units placed` is the
         prospective coverage if this landing were committed. -->
    <Panel class="space-y-2" aria-label="Coverage before merge">
      <PanelHeader title="Coverage before merge" />
      <p class="text-sm text-muted-foreground">
        {cov.covered} of {cov.total} answer unit{cov.total === 1 ? '' : 's'} answered ·
        {cov.unclaimed} outstanding
      </p>
      <MergeWheel
        workbook={workbookAssessment.workbook}
        parties={base.parties}
        answers={base.answers}
        {clashes}
      />
      <p class="text-xs text-muted-foreground">
        Each spoke fills as its units land; a red dashed remainder is still
        outstanding. A clash counts as outstanding until it is decided.
      </p>
    </Panel>
  {:else}
    <LandingHistory
      {ledger}
      {workbookAssessment}
      parties={base.parties}
      {viewer}
      view={history}
      {selected}
      onView={onHistory}
      onOpen={onOpenLanding}
      {onAddPartial}
      onSelect={onSelectRecord}
      onOpenLanding={onOpenNeighbor}
      {onOpenQuestion}
    />
  {/if}
</div>

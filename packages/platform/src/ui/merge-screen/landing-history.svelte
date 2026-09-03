<script lang="ts">
  import type { Landing, Party, Target, WorkbookAssessment } from '../../schema';
  import type { HistoryContext, HistoryView, RecordRef, Viewer } from '../../merge';
  import {
    historyGroups,
    historyScreen,
    landingForSearch,
    landingParticipants,
    ledgerSummary,
    shortLandingId,
  } from '../../merge';
  import { Button } from '../button';
  import { Panel } from '../panel';
  import HistoryFilterBar from './history-filter-bar.svelte';
  import LandingDetail from './landing-detail.svelte';
  import LandingList from './landing-list.svelte';

  // The Landing chronology (landing-history §2.5, §3.3): the control row, the
  // date-grouped list, and the Landing whose detail is open. The reading position
  // arrives as view state from the app shell — nothing here is component state.
  type Props = {
    ledger: Landing[];
    workbookAssessment: WorkbookAssessment;
    parties: Party[];
    viewer: Viewer;
    view: HistoryView;
    selected: RecordRef | null;
    onView: (view: HistoryView) => void;
    onOpen: (id: string, scroll: number) => void;
    onAddPartial: () => void;
    onSelect: (ref: RecordRef | null) => void;
    onOpenLanding: (id: string) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let {
    ledger,
    workbookAssessment,
    parties,
    viewer,
    view,
    selected,
    onView,
    onOpen,
    onAddPartial,
    onSelect,
    onOpenLanding,
    onOpenQuestion,
  }: Props = $props();

  const totals = $derived(ledgerSummary(ledger));
  const ctx = $derived<HistoryContext>({
    workbook: workbookAssessment.workbook,
    parties,
    viewer,
  });
  const groups = $derived(historyGroups(ledger, ctx, view.filters));
  const shown = $derived(groups.reduce((total, group) => total + group.landings.length, 0));
  const participants = $derived(landingParticipants(ledger));
  const screen = $derived(historyScreen(ledger, view));

  function submitSearch(): void {
    const hit = landingForSearch(ledger, view.filters.search);
    if (hit !== null) onOpen(hit.id, view.scroll);
  }
</script>

<section class="space-y-3" aria-label="History">
  {#if screen.kind === 'missing'}
    {@const id = screen.id}
    <Panel as="div" class="space-y-2" data-history-missing>
      <p class="text-sm font-medium text-foreground">Landing not found in this assessment</p>
      <p class="text-sm text-muted-foreground">
        This assessment does not carry Landing <span class="font-mono">{shortLandingId(id)}</span>.
        It may belong to another workbook-assessment.
      </p>
      <Button
        variant="outline"
        data-history-return
        aria-label="Return to history"
        onclick={() => onView({ ...view, landing: null, record: null })}>Return to history</Button
      >
    </Panel>
  {:else if screen.kind === 'no-ledger'}
    <Panel as="div" class="space-y-2" data-history-empty>
      <p class="text-sm font-medium text-foreground">No partials have landed yet</p>
      <p class="text-sm text-muted-foreground">
        Landing history will appear here after the first reviewed partial is added to the estate
        base.
      </p>
      <Button variant="outline" onclick={onAddPartial} aria-label="Add partial">Add partial</Button>
    </Panel>
  {:else if screen.kind === 'detail'}
    <LandingDetail
      landing={screen.landing}
      {ledger}
      {workbookAssessment}
      {parties}
      {viewer}
      {selected}
      onBack={() => onView({ ...view, landing: null, record: null })}
      {onSelect}
      {onOpenLanding}
      {onOpenQuestion}
    />
  {:else}
    <HistoryFilterBar
      filters={view.filters}
      {participants}
      {shown}
      total={ledger.length}
      onFilters={(filters) => onView({ ...view, filters })}
      onSubmit={submitSearch}
    />
    <p class="text-sm text-muted-foreground" data-ledger-totals>
      {totals.landings} landing{totals.landings === 1 ? '' : 's'} · {totals.records}
      record{totals.records === 1 ? '' : 's'} · {totals.units}
      unit{totals.units === 1 ? '' : 's'}
    </p>
    <LandingList {groups} {viewer} scroll={view.scroll} {onOpen} />
  {/if}
</section>

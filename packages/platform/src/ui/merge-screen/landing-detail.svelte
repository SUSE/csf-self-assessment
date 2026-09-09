<script lang="ts">
  import type { Landing, Party, Target, WorkbookAssessment } from '../../schema';
  import type { DetailContext, RecordRef, Viewer } from '../../merge';
  import { filterDetail, landingDetail, panelOf } from '../../merge';
  import { buttonVariants } from '../button';
  import * as Sheet from '../sheet';
  import AffectedRecordsNav from './affected-records-nav.svelte';
  import DetailContextBar from './detail-context-bar.svelte';
  import LandingChangesColumn from './landing-changes.svelte';
  import LandingDetailHeader from './landing-detail-header.svelte';

  // One Landing read as its semantic before and after (landing-history §4.4-§4.8):
  // the sticky header, the navigator over every affected record, and the changes
  // column. The anchored record arrives as view state. the navigator's own search is
  // local to this reading (§3.3.2 scopes persistence to the LIST's query).
  type Props = {
    landing: Landing;
    ledger: Landing[];
    workbookAssessment: WorkbookAssessment;
    parties: Party[];
    viewer: Viewer;
    selected: RecordRef | null;
    onBack: () => void;
    onSelect: (ref: RecordRef | null) => void;
    onOpenLanding: (id: string) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let {
    landing,
    ledger,
    workbookAssessment,
    parties,
    viewer,
    selected,
    onBack,
    onSelect,
    onOpenLanding,
    onOpenQuestion,
  }: Props = $props();

  let query = $state('');
  let sheetOpen = $state(false);

  const ctx = $derived<DetailContext>({ workbookAssessment, parties, viewer });
  const full = $derived(landingDetail(landing, ledger, ctx));
  const shown = $derived(filterDetail(full, query));
  const current = $derived(panelOf(full.groups, selected)?.label ?? null);
</script>

<section class="space-y-3" data-landing-detail aria-label="Landing">
  <LandingDetailHeader
    heading={full.heading}
    neighbors={full.neighbors}
    {onBack}
    {onOpenLanding}
  />
  <Sheet.Root bind:open={sheetOpen}>
    <DetailContextBar title={full.heading.title} {current} {onBack}>
      {#snippet trigger()}
        <Sheet.Trigger
          class={buttonVariants({ variant: 'outline', size: 'xs' })}
          data-affected-sheet-trigger
        >
          Affected records
        </Sheet.Trigger>
      {/snippet}
    </DetailContextBar>
    <Sheet.Content side="left" data-affected-sheet>
      <Sheet.Title>Affected records</Sheet.Title>
      <AffectedRecordsNav
        groups={shown.groups}
        shown={shown.recordCount}
        total={full.recordCount}
        {query}
        {selected}
        onQuery={(value) => (query = value)}
        onSelect={(ref) => {
          onSelect(ref);
          sheetOpen = false;
        }}
      />
    </Sheet.Content>
  </Sheet.Root>
  <div class="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
    <aside class="hidden md:block">
      <AffectedRecordsNav
        groups={shown.groups}
        shown={shown.recordCount}
        total={full.recordCount}
        {query}
        {selected}
        onQuery={(value) => (query = value)}
        {onSelect}
      />
    </aside>
    <div class="min-w-0">
      <LandingChangesColumn
        groups={shown.groups}
        {selected}
        filtered={query.trim() !== ''}
        {onSelect}
        {onOpenQuestion}
      />
    </div>
  </div>
</section>

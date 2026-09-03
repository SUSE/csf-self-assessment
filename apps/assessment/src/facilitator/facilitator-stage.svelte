<script lang="ts">
  import { untrack } from 'svelte';
  import type { Target, Viewer } from '@csf/platform';
  import { ErrorBanner } from '@csf/platform/ui/error-banner';
  import { StageLayout } from '@csf/platform/ui/stage-layout';
  import { EstateSetup } from '@csf/platform/ui/estate-setup';
  import { PartyRoster } from '@csf/platform/ui/parties-panel';
  import { WorkbookInspector } from '@csf/platform/ui/workbook-inspector';
  import {
    FACILITATOR_OVERLAYS,
    FACILITATOR_SECTIONS,
    FacilitatorToolbar,
  } from '@csf/platform/ui/facilitator-toolbar';
  import { RecommendationsPage } from '@csf/platform/ui/recommendations-page';
  import { ReportPrint } from '@csf/platform/ui/report-page';
  import { nowInstant } from '../clock';
  import EstateDashboard from './estate-dashboard.svelte';
  import MergeSection from './merge-section.svelte';
  import type { Facilitator } from './facilitator.svelte';

  // The facilitator STAGE (delivery §4): the imported workbook walked left to right
  // behind one toolbar. The section chooses a component; the work is the
  // controller's.
  type Props = {
    facilitator: Facilitator;
    viewer: Viewer;
    /** A load refusal, shown above the stage beside a landing refusal. */
    error: string | null;
    onAddPartial: () => void;
    onOpenLanding: (id: string, scroll: number) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let { facilitator, viewer, error, onAddPartial, onOpenLanding, onOpenQuestion }: Props = $props();

  // Two refusals reach this stage — the file that wouldn't open and the landing the
  // engine wouldn't take. Both are "why nothing happened", so both use the one
  // banner; the load error leads, being the more recent action.
  const refusal = $derived(error ?? facilitator.merge.refusal);
  const section = $derived(facilitator.section);
  const overlay = $derived(facilitator.overlay?.kind ?? null);
  const workbook = $derived(facilitator.inspectWorkbook ?? facilitator.workbook);

  // Carousel direction: the axis is the icon row left-to-right — sections, then the
  // overlays that render past them. Keyed on the SAME value as the carousel, or an
  // overlay swap reuses the last section's direction. $effect.pre, so the keyed
  // block reads it as it swaps.
  const STAGE_ORDER: readonly string[] = [...FACILITATOR_SECTIONS, ...FACILITATOR_OVERLAYS];
  const stageKey = $derived<string>(overlay ?? section);
  let slideDir = $state(1);
  let lastKey: string | null = null;
  let lastIndex = 0;
  $effect.pre(() => {
    const current = stageKey;
    const index = STAGE_ORDER.indexOf(current);
    const i = index === -1 ? 0 : index;
    untrack(() => {
      if (lastKey !== null && current !== lastKey) slideDir = i < lastIndex ? -1 : 1;
      lastKey = current;
      lastIndex = i;
    });
  });
</script>

{#snippet banner()}
  <ErrorBanner message={refusal} />
{/snippet}

<div class="mx-auto max-w-none space-y-4 p-6">
  <StageLayout
    {stageKey}
    dir={slideDir}
    contentClass="pt-2"
    {banner}
  >
    {#snippet header()}
      <!-- The ledger is a destination that only exists once a landing does, so an
           omitted `onHistory` hides it rather than offering a view of nothing. It
           is reachable from any section (the handler moves to Merge, where the
           ledger renders); Merge is what returns to the review. -->
      <FacilitatorToolbar
        {section}
        sections={facilitator.sections}
        context={facilitator.estate.trim() || facilitator.workbook?.meta.title || ''}
        onSection={(s) => facilitator.goToSection(s)}
        recommendationsOpen={overlay === 'recommendations'}
        onReport={facilitator.estateAssessment !== null && facilitator.result !== null
          ? () => facilitator.printReport(nowInstant())
          : undefined}
        onRecommendations={facilitator.result !== null &&
        (workbook?.recommendations.length ?? 0) > 0
          ? () => facilitator.openRecommendations()
          : undefined}
        historyOpen={facilitator.merge.history !== null}
        onHistory={facilitator.merge.ledger.length > 0
          ? () => facilitator.openHistory()
          : undefined}
      />
    {/snippet}

    {#if workbook === null}
      <p class="text-sm text-muted-foreground">No workbook imported.</p>
    {:else if overlay === 'recommendations' && facilitator.estateAssessment && facilitator.result}
      <RecommendationsPage
        result={facilitator.result}
        workbook={facilitator.estateAssessment.workbook}
        parties={facilitator.estateAssessment.parties}
      />
    {:else if section === 'setup'}
      <EstateSetup
        {workbook}
        estate={facilitator.estate}
        parties={facilitator.parties}
        onEstate={(v) => (facilitator.estate = v)}
        onParties={(p) => (facilitator.parties = p)}
        onExport={(estate, seeded) => facilitator.exportWorkbookAssessment(estate, seeded)}
      />
    {:else if section === 'parties'}
      <!-- The roster is edited in Setup (one app-owned list), so this stays a
           reflection that says where. -->
      <PartyRoster
        {workbook}
        parties={facilitator.parties}
        onEdit={() => facilitator.goToSection('setup')}
        editLabel="Edit in Setup"
      />
    {:else if section === 'merge'}
      <MergeSection {facilitator} {viewer} {onAddPartial} {onOpenLanding} {onOpenQuestion} />
    {:else if section === 'dashboard'}
      <EstateDashboard {facilitator} />
    {:else}
      <WorkbookInspector
        {workbook}
        {section}
        parties={facilitator.inspectParties}
        answers={facilitator.inspectAnswers}
      />
    {/if}
  </StageLayout>
</div>

<!-- Outside the stage: the Report prints without taking it, so the section behind
     is still there when the dialog closes. -->
{#if facilitator.reportGeneratedAt !== null && facilitator.estateAssessment && facilitator.result}
  <ReportPrint
    assessment={facilitator.estateAssessment}
    result={facilitator.result}
    stamp={{ generatedAt: facilitator.reportGeneratedAt, viewer }}
    onDone={() => (facilitator.reportGeneratedAt = null)}
  />
{/if}

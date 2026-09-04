<script lang="ts">
  import { untrack } from 'svelte';
  import { assessmentOf } from '@csf/platform';
  import type { Viewer } from '@csf/platform';
  import { ErrorBanner } from '@csf/platform/ui/error-banner';
  import { ReportPrint } from '@csf/platform/ui/report-page';
  import { StageLayout } from '@csf/platform/ui/stage-layout';
  import { Dashboard } from '@csf/platform/ui/dashboard';
  import { RecommendationsPage } from '@csf/platform/ui/recommendations-page';
  import { FillSurface, StageNav } from '@csf/platform/ui/fill-surface';
  import { QuestionList } from '@csf/platform/ui/workbook-facts';
  import { ASSESSMENT_SECTIONS, AssessmentToolbar } from '@csf/platform/ui/assessment-toolbar';
  import { HeaderIconButton } from '@csf/platform/ui/workbench';
  import List from '@lucide/svelte/icons/list';
  import { nowInstant } from '../clock';
  import ClaimsSection from './claims-section.svelte';
  import OverviewSection from './overview-section.svelte';
  import PartiesSection from './parties-section.svelte';
  import type { Fill } from './fill.svelte';

  // The answering stage: Overview orients, Claims chooses scope,
  // Parties manages the roster, Questions is the fill surface — under one toolbar,
  // over a stage that slides between them. Read swaps the stage for the dashboard,
  // and the toolbar's Recommendations destination for the vendor page.
  type Props = {
    fill: Fill;
    /** The reader's calendar, stamped by the shell — the Report reads its date in it.*/
    viewer: Viewer;
    /** A load refusal, shown above the stage.*/
    error: string | null;
  };
  let { fill, viewer, error }: Props = $props();

  // Narrowed once here: each snippet below is its own closure, which a template
  // `{#if}`'s narrowing would not reach.
  const workbook = $derived(fill.workbook);
  const estate = $derived(fill.estate);
  const section = $derived(fill.activeSection);
  const assessment = $derived(
    workbook !== null && estate !== null && fill.provenance !== null
      ? assessmentOf(workbook, estate, fill.allParties, fill.answers, fill.provenance)
      : null,
  );

  // Carousel direction: the axis is the toolbar's icon row LEFT TO RIGHT, so it has
  // to mirror how AssessmentToolbar composes that row — the tabs (sections minus
  // Current question), then the destinations past their divider, then the question
  // group. Print is an action with no stage, and Help is a mode, so neither appears.
  // Keyed on the SAME value as the carousel, or a mode swap reuses the last
  // section's direction. $effect.pre, so the keyed block reads it as it swaps.
  const STAGE_ORDER: readonly string[] = [
    ...ASSESSMENT_SECTIONS.filter((s) => s !== 'questions'),
    'read',
    'recommendations',
    'questions-index',
    'questions',
  ];
  const stageKey = $derived<string>(fill.mode === 'fill' ? section : fill.mode);
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
  <ErrorBanner message={error} />
{/snippet}

<!-- The Questions section's SOV/question navigation, rendered INSIDE the toolbar
     (author parity) rather than by the fill surface. -->
{#snippet questionNav()}
  {#if workbook && fill.resolvedFocusId !== null}
    <StageNav
      {workbook}
      parties={fill.walkParties}
      answers={fill.answers}
      sections={fill.sections}
      focusId={fill.resolvedFocusId}
      onFocus={(id) => (fill.focusId = id)}
      bordered={false}
    />
  {/if}
{/snippet}

<!-- The whole walk at once, beside Current question. A plain list icon, never the
     tab's ListTodo — they sit together and go to different places. -->
{#snippet questionsIndexButton()}
  <HeaderIconButton
    label="All questions"
    Icon={List}
    active={fill.mode === 'questions-index'}
    disabled={fill.activeClaimIndex < 0}
    onclick={() => fill.toggleQuestionsIndex()}
  />
{/snippet}

<div class="mx-auto max-w-none space-y-4 p-6">
  <StageLayout
    {stageKey}
    dir={slideDir}
    contentClass="pt-2"
    {banner}
  >
    {#snippet header()}
      <AssessmentToolbar
        {section}
        sections={[...ASSESSMENT_SECTIONS]}
        disabledSections={fill.activeClaimIndex < 0 ? ['questions'] : []}
        participant={fill.participant?.name ?? null}
        activeClaim={fill.activeClaimLabel}
        onSection={(s) => fill.goToSection(s)}
        nav={section === 'questions' && fill.resolvedFocusId !== null ? questionNav : undefined}
        navLead={questionsIndexButton}
        onReport={fill.result ? () => fill.printReport(nowInstant()) : undefined}
        readOpen={fill.mode === 'read'}
        onRead={fill.result ? () => fill.openRead() : undefined}
        recommendationsOpen={fill.mode === 'recommendations'}
        onRecommendations={workbook !== null && workbook.recommendations.length > 0
          ? () => fill.openRecommendations()
          : undefined}
      />
    {/snippet}

    {#if workbook === null || estate === null}
      <p class="text-sm text-muted-foreground">Nothing loaded.</p>
    {:else if fill.mode === 'recommendations' && fill.result}
      <RecommendationsPage result={fill.result} {workbook} parties={fill.allParties} />
    {:else if fill.mode === 'read' && fill.result}
      <Dashboard
        result={fill.result}
        {workbook}
        parties={fill.allParties}
        maximised={fill.maximisedTile}
        onMaximise={(id) => (fill.maximisedTile = id)}
        onOpenQuestion={(id) => fill.openQuestion(id)}
      />
    {:else if fill.mode === 'questions-index'}
      <QuestionList
        {workbook}
        parties={fill.walkParties}
        answers={fill.answers}
        scope={fill.walkQuestionIds}
        onSelect={(id) => fill.openQuestion(id)}
        selectedId={fill.resolvedFocusId}
      />
    {:else if section === 'overview'}
      <OverviewSection {fill} {workbook} {estate} />
    {:else if section === 'parties'}
      <PartiesSection {fill} {workbook} />
    {:else if section === 'claims'}
      <ClaimsSection {fill} {workbook} />
    {:else}
      <FillSurface
        {workbook}
        parties={fill.walkParties}
        answers={fill.answers}
        sections={fill.sections}
        focusId={fill.focusId}
        onChange={(next) => (fill.answers = next)}
        onFocus={(id) => (fill.focusId = id)}
        showNav={false}
      />
    {/if}
  </StageLayout>
</div>

<!-- Outside the stage: the Report prints without taking the stage, so whatever the
     reader was on is still there when the dialog closes. -->
{#if fill.reportGeneratedAt !== null && fill.result && assessment !== null}
  <ReportPrint
    {assessment}
    result={fill.result}
    stamp={{ generatedAt: fill.reportGeneratedAt, viewer }}
    onDone={() => (fill.reportGeneratedAt = null)}
  />
{/if}

<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Tooltip from '../tooltip';
  import { HelpToggle } from '../rulebook';
  import HeaderIconButton from '../workbench/stage-header/header-icon-button.svelte';
  import SectionTab from './section-tab.svelte';
  import CircleDot from '@lucide/svelte/icons/circle-dot';
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Printer from '@lucide/svelte/icons/printer';
  import type { AssessmentSection } from './model';

  // The assessor's stage navigation: the participant-app
  // twin of the Author workbench's stage-header (ui/workbench/stage-header). Same
  // shape, same components — a row of section icon-buttons (HeaderIconButton, the
  // exact control the author uses), a divider, then the SOV/question navigation
  // for the Questions section (passed in as `nav` — the shared QuestionNav, the
  // same breadcrumb + full-map dialog the author's stage-header composes).
  // Spans the full stage width. the active claim badge + participant ride on the
  // right. Owns no state — the app holds the active section and receives moves via
  // `onSection`.
  type Props = {
    section: AssessmentSection;
    /** The tabs to show, in workbook order.*/
    sections: AssessmentSection[];
    /** Tabs that are shown but not openable yet (e.g. Questions with no active claim).*/
    disabledSections?: AssessmentSection[];
    /** The participant's name, or null when none is named yet.*/
    participant?: string | null;
    /** Label of the active claim (what Questions answers), or null when none is active.*/
    activeClaim?: string | null;
    onSection: (section: AssessmentSection) => void;
    /** SOV/question navigation, shown after a divider (Questions section only).*/
    nav?: Snippet | undefined;
    /** Anchored at the nav's divider, outside the centred group — a control about
     * the whole question set, which must not drift as the crumb changes width.*/
    navLead?: Snippet | undefined;
    readOpen?: boolean;
    /** Shows the dashboard read-back. Absent hides the button.*/
    onRead?: (() => void) | undefined;
    /** The recommendations page is the view being shown.*/
    recommendationsOpen?: boolean;
    /** SHOWS the recommendations page — a destination, not a toggle (the Landing
     * history precedent): pressing it again keeps showing it, and the way back is
     * a section beside it. ABSENT hides the button, which is how the caller says
     * this instrument recommends nothing.*/
    onRecommendations?: (() => void) | undefined;
    /** PRINTS the Report — an action, not a destination: the document is built off
     * the screen and handed to the browser's print dialog, so there is no view to
     * come back from. ABSENT hides the button.*/
    onReport?: (() => void) | undefined;
  };
  let {
    section,
    sections,
    disabledSections = [],
    participant = null,
    activeClaim = null,
    onSection,
    nav,
    navLead,
    readOpen = false,
    onRead,
    recommendationsOpen = false,
    onRecommendations,
    onReport,
  }: Props = $props();

  // Current question leaves the tab row for the question group at the nav divider.
  // It renders whether or not `nav` does — it is the way back to the walk.
  const tabs = $derived(sections.filter((s) => s !== 'questions'));
  const hasQuestions = $derived(sections.includes('questions'));
</script>

<Tooltip.Provider delayDuration={300}>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
    <div class="flex items-center gap-1">
      {#each tabs as s (s)}
        <SectionTab
          section={s}
          active={section === s}
          disabled={disabledSections.includes(s)}
          onclick={() => onSection(s)}
        />
      {/each}
      {#if onReport || onRecommendations || onRead}
        <!-- Past a divider: none is a section. Destinations first, then Print,
     which is an action and never reads as current. -->
        <div class="mx-1.5 h-6 w-px bg-border"></div>
        {#if onRead}
          <HeaderIconButton
            label="Dashboard"
            Icon={LayoutDashboard}
            active={readOpen}
            onclick={onRead}
          />
        {/if}
        {#if onRecommendations}
          <HeaderIconButton
            label="Recommendations"
            Icon={Lightbulb}
            active={recommendationsOpen}
            onclick={onRecommendations}
          />
        {/if}
        {#if onReport}
          <HeaderIconButton label="Print report" Icon={Printer} onclick={onReport} />
        {/if}
      {/if}
      <!-- Help CLOSES the section row past a divider (author stage-header parity):
     it is a mode, not a destination, so it never sits among the tabs. -->
      <div class="mx-1.5 h-6 w-px bg-border"></div>
      <HelpToggle />
    </div>

    {#if hasQuestions}
      <div class="flex items-center gap-1">
        <div class="mr-1.5 h-6 w-px bg-border"></div>
        {#if navLead}{@render navLead()}{/if}
        <SectionTab
          section="questions"
          active={section === 'questions'}
          disabled={disabledSections.includes('questions')}
          onclick={() => onSection('questions')}
        />
      </div>
    {/if}

    {#if nav}
      <!-- Grow into the toolbar's free space and center the breadcrumb in it, so
     the nav sits mid-stage rather than crammed against the section tabs.
     `flex-1` (not `mx-auto`) because the claim block drops its `ml-auto`
     when nav is present — auto margins would otherwise eat the free space
     before flex-grow could. -->
      <div class="flex min-w-0 flex-1 items-center justify-center">
        {@render nav()}
      </div>
    {/if}

    <div class="flex min-w-0 flex-col items-end gap-1 {nav ? '' : 'ml-auto'}">
      {#if activeClaim}
        <!-- The claim you're answering is current CONTEXT, not a good/done outcome —
     so it's a neutral `bg-accent` chip (the same "current" language the active
     section tab uses), never `primary` green . -->
        <span
          class="inline-flex min-w-0 max-w-[22rem] items-center gap-1.5 rounded-full border border-border bg-accent px-2.5 py-1 text-xs font-medium text-foreground"
          title="Active claim — {activeClaim}"
        >
          <CircleDot class="size-3 shrink-0 text-muted-foreground" />
          <span class="truncate">{activeClaim}</span>
        </span>
      {/if}
      {#if participant}
        <p class="truncate text-xs text-muted-foreground">{participant}</p>
      {/if}
    </div>
  </div>
</Tooltip.Provider>

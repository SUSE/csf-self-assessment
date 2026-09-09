<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '@lucide/svelte';
  import * as Tooltip from '../tooltip';
  import { HelpToggle } from '../rulebook';
  import HeaderIconButton from '../workbench/stage-header/header-icon-button.svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import Target from '@lucide/svelte/icons/target';
  import Layers from '@lucide/svelte/icons/layers';
  import Users from '@lucide/svelte/icons/users';
  import Tags from '@lucide/svelte/icons/tags';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import GitMerge from '@lucide/svelte/icons/git-merge';
  import Gauge from '@lucide/svelte/icons/gauge';
  import ListTodo from '@lucide/svelte/icons/list-todo';
  import History from '@lucide/svelte/icons/history';
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import Printer from '@lucide/svelte/icons/printer';
  import type { FacilitatorSection } from './model';

  // The facilitator's stage navigation, the facilitator-app twin of the assessor's
  // AssessmentToolbar (ui/assessment-toolbar) and the Author workbench's
  // stage-header. Same shape, same components — a row of section icon-buttons
  // (HeaderIconButton, the exact control the author and assessor use), then an
  // optional divider + the SOV/question navigation for the Questions section
  // (passed in as `nav` — the shared QuestionNav). Spans the full stage width. the
  // working context (workbook title / estate name) rides on the right. Owns no
  // state — the app holds the active section and receives moves via `onSection`.
  type Props = {
    section: FacilitatorSection;
    /** The tabs to show, in workbook order.*/
    sections: FacilitatorSection[];
    /** Tabs shown but not openable yet (e.g. Merge before a workbook-assessment is loaded).*/
    disabledSections?: FacilitatorSection[];
    /** The working context line — the estate name, or the workbook title before setup.*/
    context?: string | null;
    onSection: (section: FacilitatorSection) => void;
    /** SOV/question navigation, shown after a divider (Questions section only).*/
    nav?: Snippet | undefined;
    /** The merge ledger view is open. Marks History as the current view and takes
     * the current mark off Merge — the two are destinations, not one toggle.*/
    historyOpen?: boolean;
    /** SHOWS the ledger view. It is not a toggle: pressing it while history is
     * already open just keeps showing the history — the way BACK to the review is
     * the Merge button beside it. ABSENT hides the button entirely — that is how
     * the caller says "no history to show": there is nothing to open when no
     * landing has happened, and a disabled control would only invite the
     * question. It reads as a header destination, not a twelfth section, so it
     * sits past a divider.*/
    onHistory?: (() => void) | undefined;
    /** PRINTS the Report — an action, not a destination: the document is built off
     * the screen and handed to the browser's print dialog, so the reader stays
     * where they were. ABSENT hides the button entirely, which is how the caller
     * says no estate has landed to report on.*/
    onReport?: (() => void) | undefined;
    /** The recommendations page is the view being shown.*/
    recommendationsOpen?: boolean;
    /** SHOWS the recommendations page, on the same terms as `onHistory`: a
     * destination past the sections, hidden entirely when the instrument
     * recommends nothing. Unlike history it is not tied to a section — the
     * offers read against the whole assessment, so it opens from anywhere.*/
    onRecommendations?: (() => void) | undefined;
  };
  let {
    section,
    sections,
    disabledSections = [],
    context = null,
    onSection,
    nav,
    historyOpen = false,
    onHistory,
    onReport,
    recommendationsOpen = false,
    onRecommendations,
  }: Props = $props();

  // Three groups, split by dividers. LEAD is the instrument as authored — the
  // read-only inspection sections plus the estate roster and setup. TRAIL is the
  // workshop as it happens: what the room answers, what comes back, what landed
  // (History sits with Merge because it is Merge's own record, not a section of
  // its own — which is also why it renders only where Merge does). REPORTING is
  // what the workshop reads back: the Dashboard, its Report, and the offers made against it.
  const TRAILING: readonly FacilitatorSection[] = ['questions', 'merge'];
  const REPORTING: readonly FacilitatorSection[] = ['dashboard'];
  // The lead keeps the caller's (workbook) order. the later groups are fixed
  // here, so they read the same whichever tabs a given estate happens to have.
  const lead = $derived(sections.filter((s) => !TRAILING.includes(s) && !REPORTING.includes(s)));
  const trail = $derived(TRAILING.filter((s) => sections.includes(s)));
  const reporting = $derived(REPORTING.filter((s) => sections.includes(s)));

  // Exactly one control reads as current. Recommendations covers whichever section
  // is behind it, so while it is open no section is marked. history does the same
  // for Merge alone, being Merge's own record. Report marks nothing — it prints.
  const isCurrent = (s: FacilitatorSection) =>
    section === s && !recommendationsOpen && !(s === 'merge' && historyOpen);

  // `rule` names the FACILITATOR_RULES card that explains each section, so help
  // mode turns this row into the help index (HeaderIconButton owns the gating).
  // The three read-only inspection sections have no card yet and correctly grey
  // out in help mode until one is written — an absent rule is the honest state,
  // not a placeholder card.
  const META: Record<FacilitatorSection, { label: string; Icon: LucideIcon; rule?: string }> = {
    overview: { label: 'Overview', Icon: LayoutDashboard, rule: 'overview' },
    frontsheet: { label: 'Front sheet', Icon: FileText },
    objectives: { label: 'Objectives', Icon: Target },
    dimensions: { label: 'Dimensions', Icon: Layers, rule: 'dimensions' },
    roles: { label: 'Roles', Icon: Users },
    'party-types': { label: 'Party types', Icon: Tags, rule: 'party-types' },
    parties: { label: 'Parties', Icon: Building2, rule: 'parties' },
    setup: { label: 'Setup', Icon: Settings2, rule: 'setup' },
    merge: { label: 'Merge', Icon: GitMerge, rule: 'merge' },
    dashboard: { label: 'Dashboard', Icon: Gauge, rule: 'dashboard' },
    questions: { label: 'Questions', Icon: ListTodo, rule: 'questions' },
  };
</script>

<Tooltip.Provider delayDuration={300}>
  <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-1">
    <div class="flex items-center gap-1">
      {#each lead as s (s)}
        <HeaderIconButton
          label={META[s].label}
          Icon={META[s].Icon}
          rule={META[s].rule}
          active={isCurrent(s)}
          disabled={disabledSections.includes(s)}
          onclick={() => onSection(s)}
        />
      {/each}
    </div>

    {#if trail.length > 0}
      <div class="h-6 w-px bg-border"></div>
      <div class="flex items-center gap-1">
        {#each trail as s (s)}
          <!-- Merge loses the current mark while its ledger is open, so exactly one
     of the pair reads as current — and pressing Merge is how you come
     back to the review. -->
          <HeaderIconButton
            label={META[s].label}
            Icon={META[s].Icon}
            rule={META[s].rule}
            active={isCurrent(s)}
            disabled={disabledSections.includes(s)}
            onclick={() => onSection(s)}
          />
          {#if s === 'merge' && onHistory}
            <HeaderIconButton
              label="Landing history"
              Icon={History}
              active={historyOpen}
              onclick={onHistory}
            />
          {/if}
        {/each}
      </div>
    {/if}

    <!-- The reporting group: the Dashboard, the offers read against it, and the
     Print report action last, past their own divider. Nothing here is a rider on
     the Dashboard tab — each opens from any section, and still shows on an
     estate with no Dashboard. -->
    {#if reporting.length > 0 || onReport || onRecommendations}
      <div class="flex items-center gap-1">
        <div class="mx-1.5 h-6 w-px bg-border"></div>
        {#each reporting as s (s)}
          <HeaderIconButton
            label={META[s].label}
            Icon={META[s].Icon}
            rule={META[s].rule}
            active={isCurrent(s)}
            disabled={disabledSections.includes(s)}
            onclick={() => onSection(s)}
          />
        {/each}
        {#if onRecommendations}
          <HeaderIconButton
            label="Recommendations"
            Icon={Lightbulb}
            active={recommendationsOpen}
            onclick={onRecommendations}
          />
        {/if}
        <!-- Print report ends the group because it is the only ACTION in it: the
     destinations before it can read as current, this one never does. -->
        {#if onReport}
          <HeaderIconButton label="Print report" Icon={Printer} onclick={onReport} />
        {/if}
      </div>
    {/if}

    <!-- Help CLOSES the icon row past a divider (author stage-header parity): it is
     a mode, not a destination, so it never sits among the tabs, and it ends the
     row rather than joining the workshop timeline group. Its own group, not the
     trail's, so an estate with no trailing tabs still has help. -->
    <div class="flex items-center gap-1">
      <div class="mx-1.5 h-6 w-px bg-border"></div>
      <HelpToggle />
    </div>

    {#if nav}
      <div class="h-6 w-px bg-border"></div>
      <!-- Grow into the toolbar's free space and center the breadcrumb in it, so
     the nav sits mid-stage rather than crammed against the section tabs
     (assessment-toolbar parity). -->
      <div class="flex min-w-0 flex-1 items-center justify-center">
        {@render nav()}
      </div>
    {/if}

    {#if context}
      <p class="truncate text-xs text-muted-foreground {nav ? '' : 'ml-auto'}">{context}</p>
    {/if}
  </div>
</Tooltip.Provider>

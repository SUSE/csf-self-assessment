<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import type {
    EstateFloorFlip,
    RecommendationReadout,
    TestEstateReading,
  } from '../../author';
  import { issuesUnder } from '../../schema';
  import { untrack, type Snippet } from 'svelte';
  import { QuestionEditor } from '../question-editor';
  import { RecommendationEditor, RecommendationsList } from '../recommendations-editor';
  import { StageLayout } from '../stage-layout';
  import StageHeader from './stage-header';
  import Overview from './overview.svelte';
  import DimensionsPanel from './dimensions-panel.svelte';
  import FrontSheetPanel from './front-sheet-panel.svelte';
  import ObjectiveEditor from './objective-editor.svelte';
  import ObjectivesPanel from './objectives-panel.svelte';
  import PartyTypesPanel from './party-types-panel.svelte';
  import QuestionsIndex from './questions-index.svelte';
  import RolesPanel from './roles-panel.svelte';
  import TestEstatesPanel from './test-estates-panel.svelte';
  import { getHelp } from '../rulebook';
  import {
    focusKey,
    objectiveSite,
    questionSite,
    recommendationSite,
    resolveFocus,
    stageOrder,
    type FocusRef,
  } from './focus';

  // The Author's workbench (spec §4.3c): a single-focus STAGE driven by a
  // sticky StageHeader. The header navigates; this component routes the active
  // focus to ONE editor at a time — the same editors as before, shown one by
  // one instead of stacked into a 39k-px wall. It still holds NO edit logic and
  // NO validation: pure ops build the next draft (design rule 1), strict issues
  // arrive pre-computed and are routed to the owning section via issuesUnder
  // (design rule 3). Identity fields commit on change/blur (design rule 2).
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    focus: FocusRef;
    onFocus: (focus: FocusRef) => void;
    onDraft: (next: Workbook) => void;
    /** The dead-ad gauge for the overview. `null` while the draft has strict
     *  issues, because the readout runs the real engine (the `estatesLive`
     *  precedent in the app shell). */
    recommendationReadout: RecommendationReadout | null;
    /** The overview's live test-estate readings — the real engine, so `null`
     *  while the draft has strict issues. */
    estateReadings: TestEstateReading[] | null;
    /** Floor changes between the last two valid evaluations. The baseline is the
     *  app shell's to hold, so the comparison arrives ready. */
    estateFlips: EstateFloorFlip[];
    /** The app's stage destinations, closing the stage header's icon row. */
    destinations?: Snippet | undefined;
    /** A stage to show INSTEAD of the focused editor, keyed by `stageId`. The
     *  header stays put and keeps navigating, so the app's other surfaces are
     *  destinations within the workbench rather than a screen that replaces it. */
    stage?: Snippet | undefined;
    stageId?: string | undefined;
    /** The destination ids in the order their icons appear, so the carousel knows
     *  which way to slide between a destination and the workbench. */
    stageIds?: string[];
  };
  let {
    draft,
    issues,
    focus,
    onFocus,
    onDraft,
    recommendationReadout,
    estateReadings,
    estateFlips,
    destinations,
    stage,
    stageId,
    stageIds = [],
  }: Props = $props();

  // Help mode: mark the governed controls across every workbench section
  // (dimensions, objectives, estates and the question editor) and follow the
  // cursor, so hovering a marked field brings its rule up in the floating panel.
  // One delegated listener on the stage root; `data-rule` markers on controls name
  // the card that governs them.
  //
  // The session comes from context (ui/rulebook), not from props: the same mode is
  // read by a toggle in the stage header and a panel outside the shell's content
  // row, and this component sits between them without being either. `follow`
  // promotes only while help mode is on, so no guard is needed here.
  const help = getHelp();
  let rootEl = $state<HTMLElement | null>(null);
  $effect(() => {
    const el = rootEl;
    if (!el || !help) return;
    let last: string | null = null;
    const sectionAt = (e: Event): string | null =>
      (e.target as HTMLElement).closest<HTMLElement>('[data-rule]')?.dataset.rule ?? null;
    const report = (e: PointerEvent): void => {
      const section = sectionAt(e);
      if (section && section !== last) {
        last = section;
        help.follow(section);
      }
    };
    el.addEventListener('pointerover', report);
    el.addEventListener('pointerdown', report);
    return () => {
      el.removeEventListener('pointerover', report);
      el.removeEventListener('pointerdown', report);
    };
  });

  // The focus, kept pointing at something that still exists — after a Remove
  // the held focus can name a gone target (resolveFocus falls back to the first
  // question, so the stage never renders a dangling editor and never crashes).
  const activeFocus = $derived(resolveFocus(draft, focus));

  // A row to flash when the overview's instrument wheel deep-links to it (a
  // dimension or party-type id). Transient UI, not part of focus/history: when
  // set, scroll the matching `[data-highlight]` row into view and tint it, then
  // clear itself so the flash fades. The stage renders it after the focus change
  // in the same handler, so by the time this effect runs the row is in the DOM.
  let highlight = $state<string | null>(null);
  $effect(() => {
    const id = highlight;
    if (id === null || !rootEl) return;
    rootEl
      .querySelector<HTMLElement>(`[data-highlight="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = setTimeout(() => (highlight = null), 1800);
    return () => clearTimeout(timer);
  });

  // --- carousel motion (the same slideshow as the participant fill surface) --
  // The axis is the stage header's icon row, LEFT TO RIGHT: a destination further
  // right enters from the right, one further left enters from the left. So it runs
  // through the instrument sections in SectionNav order (Recommendations among
  // them, each offer behind its list), then Test estates past their divider, then
  // the QuestionNav group — the Questions index and the objective/question walk it
  // steps through — and finally the app's own destinations, which close the row.
  // $effect.pre, so the {#key} block reads the direction as it swaps.
  const order = $derived(stageOrder(draft, stageIds));

  const stageKey = $derived(stage ? `stage:${stageId}` : focusKey(activeFocus));
  let slideDir = $state(1);
  let lastKey: string | null = null;
  let lastIndex = 0;
  $effect.pre(() => {
    const key = stageKey;
    const found = order.indexOf(key);
    const index = found === -1 ? 0 : found;
    untrack(() => {
      if (lastKey !== null && key !== lastKey) slideDir = index < lastIndex ? -1 : 1;
      lastKey = key;
      lastIndex = index;
    });
  });

</script>

<div bind:this={rootEl} class:rules-visible={help?.open}>
  <StageLayout {stageKey} dir={slideDir}>
    {#snippet header()}
      <StageHeader {draft} focus={activeFocus} {issues} {onFocus} {onDraft} {destinations} />
    {/snippet}

    {#if stage}
      {@render stage()}
    {:else if activeFocus.kind === 'overview'}
      <Overview
        {draft}
        {issues}
        {onDraft}
        {onFocus}
        {recommendationReadout}
        {estateReadings}
        {estateFlips}
        onNavigate={(section, id) => {
          highlight = id;
          onFocus({ kind: section });
        }}
      />
    {:else if activeFocus.kind === 'frontSheet'}
      <FrontSheetPanel {draft} {onDraft} />
    {:else if activeFocus.kind === 'objectives'}
      <ObjectivesPanel
        {draft}
        {issues}
        {onDraft}
        onOpen={(id) => onFocus({ kind: 'objective', id })}
      />
    {:else if activeFocus.kind === 'questions'}
      <QuestionsIndex {draft} onOpenQuestion={(id) => onFocus({ kind: 'question', id })} />
    {:else if activeFocus.kind === 'dimensions'}
      <DimensionsPanel {draft} {issues} {highlight} {onDraft} />
    {:else if activeFocus.kind === 'roles'}
      <RolesPanel {draft} {issues} {onDraft} />
    {:else if activeFocus.kind === 'parties'}
      <PartyTypesPanel {draft} {issues} {highlight} {onDraft} />
    {:else if activeFocus.kind === 'testEstates'}
      <TestEstatesPanel {draft} {issues} {onDraft} />
    {:else if activeFocus.kind === 'recommendations'}
      <RecommendationsList
        {draft}
        {issues}
        {onDraft}
        onOpen={(id) => onFocus({ kind: 'recommendation', id })}
      />
    {:else if activeFocus.kind === 'recommendation'}
      {@const site = recommendationSite(draft, activeFocus.id)}
      {#if site}
        <RecommendationEditor
          {draft}
          recommendation={site.recommendation}
          issues={issuesUnder(issues, ['recommendations', site.index])}
          {onDraft}
          onBack={() => onFocus({ kind: 'recommendations' })}
        />
      {/if}
    {:else if activeFocus.kind === 'objective'}
      {@const objective = objectiveSite(draft, activeFocus.id)}
      {#if objective}
        <ObjectiveEditor
          {draft}
          {objective}
          {issues}
          {onDraft}
          onOpenQuestion={(id) => onFocus({ kind: 'question', id })}
          onOpenRecommendation={(id) => onFocus({ kind: 'recommendation', id })}
        />
      {/if}
    {:else if activeFocus.kind === 'question'}
      {@const site = questionSite(draft, activeFocus.id)}
      {#if site}
        <QuestionEditor
          {draft}
          question={site.question}
          issues={issuesUnder(issues, ['objectives', site.objectiveIndex, 'questions', site.questionIndex])}
          {onDraft}
          onOpenRecommendation={(id) => onFocus({ kind: 'recommendation', id })}
        />
      {/if}
    {/if}
  </StageLayout>
</div>

<style>
  /* Help mode on: reveal which controls across the whole stage are governed by a
     rule. A dashed outline at rest, solid + tinted on hover as the panel brings
     that rule to the top. Marked only in this mode — the stage is unadorned the
     rest of the time, so editing stays quiet.
     The ink is `--foreground`, not `--primary`: under SUSE primary is the brand
     green, which is the SEAL hue, and a green ring around thirty fields reads as a
     verdict on them. Neutral is also what every other "this one is current"
     affordance here uses (header icons, question nav, tray chips). */
  .rules-visible :global([data-rule]) {
    outline: 1px dashed color-mix(in oklab, var(--foreground) 35%, transparent);
    outline-offset: 3px;
    border-radius: var(--radius);
    cursor: help;
    transition:
      outline-color 0.15s ease,
      background-color 0.15s ease;
  }
  /* Innermost marker only — a marked field inside a marked block would otherwise
     light both, while `closest()` promotes just the inner card. */
  .rules-visible :global([data-rule]:hover:not(:has([data-rule]:hover))) {
    outline-style: solid;
    outline-color: var(--foreground);
    background-color: color-mix(in oklab, var(--foreground) 8%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    .rules-visible :global([data-rule]) {
      transition: none;
    }
  }
</style>

<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import {
    AUTHOR_QA_PROVENANCE,
    WorkbookSchema,
    assessmentOf,
    defaultParties,
    estateFloorFlips,
    evaluate,
    evaluateTestEstate,
    fullWalk,
    recommendationReadout,
    testEstateReadings,
  } from '@csf/platform';
  import type {
    Answer,
    EstateFloorFlip,
    TestEstateReading,
    TileId,
    Viewer,
    Workbook,
  } from '@csf/platform';
  import { AppShell } from '@csf/platform/ui/app-shell';
  import NothingLoaded from './nothing-loaded.svelte';
  import DashboardStage from './dashboard-stage.svelte';
  import RecommendationsStage from './recommendations-stage.svelte';
  import ReportStage from './report-stage.svelte';
  import PreviewStage from './preview-stage.svelte';
  import {
    Workbench,
    activeAuthorMode,
    authorModeGates,
    firstFocus,
    focusForIssue,
    isAuthorScreen,
    resolveFocus,
    sameAuthorScreen,
    sectionFocus,
    type AuthorMode,
    type AuthorScreen,
    type FocusRef,
  } from '@csf/platform/ui/workbench';
  import { ErrorBanner } from '@csf/platform/ui/error-banner';
  import { ValidityStatus } from '@csf/platform/ui/validity-status';
  import {
    createInspector,
    inspectorTitle,
    type InspectSelection,
    type InspectSubject,
  } from '@csf/platform/ui/inspector';
  import { AUTHOR_RULES, RulebookPanel, createHelp } from '@csf/platform/ui/rulebook';
  import { createViewHistory, persistedView } from '@csf/platform/view-history';
  import { nowInstant } from './clock';
  import ShellActions from './shell-actions.svelte';
  import ModeToolbar from './mode-toolbar.svelte';
  import InspectorRail from './inspector-rail.svelte';
  import { createDraft } from './draft.svelte';
  import { modeItems } from './modes';

  // The Author app shell: file I/O, mode routing, reactive state. The
  // browser copy IS the active workbook — draft and view are both
  // restored on load and mirrored back on every change.
  const draftFile = createDraft({ onAdopt });
  const draft = $derived(draftFile.workbook);
  const restoredView = draftFile.workbook ? persistedView<AuthorScreen>(isAuthorScreen) : null;
  // Stamped here: the pure core reads neither clock nor environment .
  const viewer: Viewer = {
    locale: navigator.language === '' ? 'en-GB' : navigator.language,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  let mode = $state<AuthorMode>(restoredView?.mode ?? 'workbench');
  /** The instant the shell stamped when this Report was opened, or null when the
   * Report is not the live mode. Never persisted — a restore re-stamps.*/
  let reportGeneratedAt = $state<string | null>(
    restoredView?.mode === 'report' ? nowInstant() : null,
  );
  let estateId = $state<string | null>(restoredView?.estate ?? null);
  let maximisedTile = $state<TileId | null>(restoredView?.maximised ?? null);
  let previewAnswers = $state<Answer[]>([]);
  // The right rail is ONE InspectorPanel: components report what they selected to
  // this session, and the shell only declares which view renders each subject.
  const inspector = createInspector();
  // Help mode for the whole app: header toggles and the floating panel share this
  // one session without threading a prop.
  createHelp(() => AUTHOR_RULES);
  // Scratch, so it is not tracked in history — it only makes Preview navigable.
  let previewFocusId = $state<string | null>(null);
  // Which single target the workbench stage shows. The workbench resolves it against
  // the live draft, so a stale ref after a Remove can't crash.
  let focus = $state<FocusRef>(
    draftFile.workbook
      ? restoredView
        ? resolveFocus(draftFile.workbook, restoredView.focus)
        : firstFocus(draftFile.workbook)
      : { kind: 'overview' },
  );

  /** Every mode change goes through here, so `report` mode and its stamp cannot
   * drift apart.*/
  function goToMode(next: AuthorMode): void {
    mode = next;
    reportGeneratedAt = next === 'report' ? nowInstant() : null;
  }

  // Back/Forward step through both the mode and the workbench focus, so Back
  // retraces how you navigated the workbook, question to question. The view is
  // opaque in history.state. the URL never changes.
  const router = createViewHistory<AuthorScreen>(
    (v) => {
      goToMode(v.mode);
      focus = v.focus;
      estateId = v.estate;
      maximisedTile = v.maximised;
    },
    sameAuthorScreen,
    isAuthorScreen,
  );
  onDestroy(() => router.destroy());
  // Snapshot `focus`: it's a $state proxy, which history.state can't clone.
  $effect(() =>
    router.reflect({
      mode,
      focus: $state.snapshot(focus),
      estate: estateId,
      maximised: maximisedTile,
    }),
  );

  const strict = $derived(draft ? WorkbookSchema.safeParse(draft) : null);
  const issues = $derived(strict && !strict.success ? strict.error.issues : []);
  // The strict PARSED workbook (defaults applied) — what Preview renders and what a
  // participant will consume. null while the draft has issues.
  const valid = $derived(strict?.success ? strict.data : null);
  const previewParties = $derived(valid ? defaultParties(valid) : []);
  const previewResult = $derived(
    valid
      ? evaluate(valid, assessmentOf(valid, 'Preview', previewParties, previewAnswers, AUTHOR_QA_PROVENANCE))
      : null,
  );
  const previewSections = $derived(valid ? fullWalk(valid) : []);

  // The overview's engine-backed readouts: they run the REAL engine, so like
  // Preview they read the strict-parsed workbook only.
  const estatesLive = $derived(valid ? testEstateReadings(valid) : null);
  const readout = $derived(valid ? recommendationReadout(valid) : null);

  // A restored id naming an estate the workbook no longer has falls back to the
  // first. `activeMode` degrades the dashboard view when there is nothing to read.
  const qaEstate = $derived(
    valid ? (valid.testEstates.find((e) => e.id === estateId) ?? valid.testEstates[0] ?? null) : null,
  );
  const qaEvaluation = $derived(
    valid && qaEstate ? evaluateTestEstate(valid, qaEstate) : null,
  );
  // The stage destinations, as data — an icon group in the stage header, the
  // facilitator toolbar's reporting group in the same place. One gate decides
  // both which button can be pressed and which destination survives.
  const gates = $derived(authorModeGates(valid, issues.length));
  const items = $derived(modeItems(gates));
  const activeMode = $derived(activeAuthorMode(mode, gates));

  // A selection belongs to the page it can be made ON, so this narrows rather than
  // clears — returning to that page still finds it.
  const SELECTION_HOME: Record<InspectSelection['kind'], AuthorMode> = {
    'instrument-chip': 'workbench',
    'instrument-reading': 'workbench',
    'estate-spoke': 'dashboard',
    objective: 'workbench',
    // The QA dashboard is where a question gets SELECTED here (a second-look check
    // reports the unit it is asking about). the workbench edits questions through
    // `focus`, not through the rail.
    question: 'dashboard',
    'seal-ladder': 'dashboard',
    'open-units': 'dashboard',
    'heat-mark': 'dashboard',
    'staircase-rung': 'dashboard',
    'dont-know': 'dashboard',
    'consistency-check': 'dashboard',
    contributor: 'dashboard',
    'provenance-fact': 'dashboard',
    evidence: 'dashboard',
    recommendation: 'recommendations',
  };
  const railSelection = $derived.by(() => {
    const selection = inspector.selection;
    if (selection === null) return null;
    return activeMode === SELECTION_HOME[selection.kind] ? selection : null;
  });
  /** What the rail reads on each surface when nothing is selected. Data, not a
   * five-deep ternary.*/
  const PAGE_SUBJECT: Record<AuthorMode, InspectSubject | null> = {
    workbench: null,
    preview: { kind: 'estate-reading', title: 'Live floor' },
    dashboard: {
      kind: 'hint',
      title: 'Test estate',
      text: 'Every reading for this estate is on the canvas. Open a question from a tile to edit it in the workbench.',
    },
    report: {
      kind: 'hint',
      title: 'Report',
      text: 'This is the leave-behind this estate prints. Use Print to save it as a PDF.',
    },
    recommendations: {
      kind: 'hint',
      title: 'Recommendations',
      text: 'What this estate fires, as a participant reads it. Press an offer’s trigger to see why it fired, and open a question from there to edit it in the workbench.',
    },
  };
  const pageSubject = $derived(PAGE_SUBJECT[activeMode]);
  const railSubject = $derived<InspectSubject | null>(railSelection ?? pageSubject);

  function selectMode(id: AuthorMode): void {
    // Preview seeds its scratch answers, so it is entered through its own handler.
    if (id === 'preview') enterPreview();
    else goToMode(id);
  }

  // Floor-flip announcement: compare each valid evaluation with the
  // LAST valid one. invalid interludes don't reset the baseline. Reading
  // `estateReadings` tracked would loop the effect, hence untrack.
  let estateReadings = $state<TestEstateReading[] | null>(null);
  let estateFlips = $state<EstateFloorFlip[]>([]);
  $effect(() => {
    const next = estatesLive;
    untrack(() => {
      if (next === null) return;
      estateFlips = estateReadings === null ? [] : estateFloorFlips(estateReadings, next);
      estateReadings = next;
    });
  });

  // The issue badge is a jump: switch to the workbench and focus the editor that
  // owns the topmost problem in path order — the stage brings it into view.
  function goToFirstIssue(): void {
    goToMode('workbench');
    if (draft && issues.length > 0) focus = focusForIssue(draft, issues[0]);
  }

  // Every way a workbook becomes the active one lands here: it resets the session
  // around the new draft and makes that a history BASELINE, so Back can't return to
  // a view that showed the workbook we just discarded.
  function onAdopt(workbook: Workbook): void {
    focus = firstFocus(workbook);
    previewAnswers = [];
    previewFocusId = null;
    estateReadings = null;
    estateFlips = [];
    inspector.clear();
    goToMode('workbench');
    estateId = null;
    maximisedTile = null;
    router.baseline({
      mode: 'workbench',
      focus: $state.snapshot(focus),
      estate: null,
      maximised: null,
    });
  }

  // The rail's one navigation off the dashboard: a question opens in its editor.
  function openQuestionInWorkbench(id: string): void {
    goToMode('workbench');
    focus = { kind: 'question', id };
  }

  function enterPreview(): void {
    previewAnswers = [];
    previewFocusId = null;
    goToMode('preview');
  }
</script>

<AppShell
  title="Author"
  rightTitle={inspectorTitle(railSubject)}
  rightWidth={railSubject?.kind === 'estate-reading' ? '18rem' : '22rem'}
  bind:rightOpen={inspector.open}
>
  {#snippet actions()}
    {#if draft}
      <ValidityStatus issueCount={issues.length} onGoToIssue={goToFirstIssue} />
    {/if}
    <ShellActions
      hasDraft={draft !== null}
      onNew={() => draftFile.startFresh()}
      onImport={() => draftFile.importFile()}
      onExport={() => draftFile.exportFile()}
    />
  {/snippet}

  {#snippet right()}
    <InspectorRail
      {draft}
      {valid}
      estate={qaEstate}
      evaluation={qaEvaluation}
      {previewResult}
      selection={railSelection}
      page={pageSubject}
      onOpenQuestion={openQuestionInWorkbench}
      onFocusQuestion={(id) => (focus = { kind: 'question', id })}
      onManageSection={(section) => (focus = sectionFocus(section))}
    />
  {/snippet}

  <!-- Mounted unconditionally — it shows itself when the session says help mode is
     on, and covers the rail rather than displacing anything. -->
  {#snippet overlay()}
    <RulebookPanel
      hint="Hover a highlighted field to bring its rule up, or press a lit header icon to open that section with its rule."
    />
  {/snippet}

  <div class="mx-auto max-w-none space-y-4 p-6">
    <ErrorBanner message={draftFile.error} />

    {#snippet modeStage()}
      {#if activeMode === 'dashboard' && qaEvaluation && qaEstate && valid}
        <DashboardStage
          workbook={valid}
          estates={valid.testEstates}
          estate={qaEstate}
          evaluation={qaEvaluation}
          maximised={maximisedTile}
          onSelectEstate={(id) => {
            estateId = id;
            maximisedTile = null;
          }}
          onMaximise={(id) => (maximisedTile = id)}
          onOpenQuestion={(id) => {
            goToMode('workbench');
            focus = { kind: 'question', id };
          }}
        />
      {:else if activeMode === 'report' && qaEvaluation && qaEstate && valid && reportGeneratedAt !== null}
        <ReportStage
          estates={valid.testEstates}
          estate={qaEstate}
          evaluation={qaEvaluation}
          stamp={{ generatedAt: reportGeneratedAt, viewer }}
          onSelectEstate={(id) => (estateId = id)}
        />
      {:else if activeMode === 'recommendations' && qaEvaluation && qaEstate && valid}
        <RecommendationsStage
          workbook={valid}
          estates={valid.testEstates}
          estate={qaEstate}
          evaluation={qaEvaluation}
          onSelectEstate={(id) => (estateId = id)}
        />
      {:else if activeMode === 'preview' && valid}
        <PreviewStage
          workbook={valid}
          parties={previewParties}
          answers={previewAnswers}
          sections={previewSections}
          focusId={previewFocusId}
          onChange={(next) => (previewAnswers = next)}
          onFocus={(id) => (previewFocusId = id)}
        />
      {/if}
    {/snippet}

    {#if !draft}
      <NothingLoaded />
    {:else}
      <!-- One stage for every mode: the header never leaves, so its sections are
     the way back off Preview, Dashboard, Recommendations and Report. -->
      <Workbench
        {draft}
        {issues}
        {focus}
        onFocus={(f) => {
          goToMode('workbench');
          focus = f;
        }}
        onDraft={(next) => draftFile.edit(next)}
        recommendationReadout={readout}
        estateReadings={estatesLive}
        {estateFlips}
        stage={activeMode === 'workbench' ? undefined : modeStage}
        stageId={activeMode}
        stageIds={items.map((m) => m.id)}
      >
        {#snippet destinations()}
          <ModeToolbar {items} active={activeMode} onSelect={selectMode} />
        {/snippet}
      </Workbench>
    {/if}
  </div>
</AppShell>

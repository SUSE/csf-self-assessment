<script lang="ts">
  import { estateAnswers } from '@csf/platform';
  import type {
    EngineResult,
    TestEstate,
    TestEstateEvaluation,
    Workbook,
  } from '@csf/platform';
  import { Hud } from '@csf/platform/ui/hud';
  import { QuestionInspector } from '@csf/platform/ui/question-inspector';
  import { SealLadder } from '@csf/platform/ui/workbook-facts';
  import { inspectChip, readingInspection } from '@csf/platform/ui/instrument-wheel';
  import type { InstrumentSection } from '@csf/platform/ui/instrument-wheel';
  import {
    ChipInspection,
    InspectorPanel,
    ObjectiveInspection,
    ReadingInspection,
    type InspectSelection,
    type InspectSubject,
    type InspectorViews,
  } from '@csf/platform/ui/inspector';
  import QaInspection from './qa-inspection.svelte';
  import type { QaReading, QaSubject } from './qa-rail';

  // The Author's right rail, as data: an inspectable surface adds a subject kind
  // and a view here, never an `{#if}`. Every read is derived in here, so the shell
  // hands over the draft and the estate and nothing else.
  type Props = {
    /** The live draft — what the instrument chip, reading and objective views
     * resolve their ids against.*/
    draft: Workbook | null;
    /** The strict-parsed draft, or null while it has issues.*/
    valid: Workbook | null;
    /** The test estate on the canvas and its reading. null with none readable.*/
    estate: TestEstate | null;
    evaluation: TestEstateEvaluation | null;
    /** Preview's running floor, for the ambient estate-reading view.*/
    previewResult: EngineResult | null;
    selection: InspectSelection | null;
    page: InspectSubject | null;
    /** Switch to the workbench and open a question's editor.*/
    onOpenQuestion: (id: string) => void;
    /** Focus a question without leaving the current destination.*/
    onFocusQuestion: (id: string) => void;
    /** Focus the instrument section a chip or a reading manages.*/
    onManageSection: (section: InstrumentSection) => void;
  };
  let {
    draft,
    valid,
    estate,
    evaluation,
    previewResult,
    selection,
    page,
    onOpenQuestion,
    onFocusQuestion,
    onManageSection,
  }: Props = $props();

  // The resolver seam: a selection carries ids only, so a chip whose dimension was
  // deleted since it was picked resolves to null rather than to stale counts.
  const inspectedChip = $derived(
    draft && selection?.kind === 'instrument-chip' ? inspectChip(draft, selection) : null,
  );
  const inspectedReading = $derived(
    draft && selection?.kind === 'instrument-reading'
      ? readingInspection(draft, selection.readingId)
      : null,
  );
  const inspectedObjective = $derived.by(() =>
    draft && selection?.kind === 'objective'
      ? (draft.objectives.find((objective) => objective.id === selection.objectiveId) ?? null)
      : null,
  );
  const inspectedQuestion = $derived.by(() =>
    draft && selection?.kind === 'question'
      ? (draft.objectives
          .flatMap((objective) => objective.questions)
          .find((question) => question.id === selection.questionId) ?? null)
      : null,
  );

  const answers = $derived(valid && estate ? estateAnswers(valid, estate) : []);
  const reading = $derived<QaReading>({
    result: evaluation?.result ?? null,
    workbook: valid,
    parties: estate?.parties ?? [],
    onOpenQuestion,
  });
</script>

{#snippet chipView()}
  <ChipInspection
    inspection={inspectedChip}
    onInspectQuestion={onFocusQuestion}
    onManage={onManageSection}
  />
{/snippet}

<!-- A ledger row read as what it counted, with the jump the row used to make
     itself. -->
{#snippet readingView()}
  <ReadingInspection
    inspection={inspectedReading}
    onManage={onManageSection}
    {onOpenQuestion}
  />
{/snippet}

{#snippet objectiveView()}
  <ObjectiveInspection
    objective={inspectedObjective}
    roles={draft?.roles ?? []}
    {onOpenQuestion}
  />
{/snippet}

<!-- A unit a QA tile is asking about, read against the estate on the canvas: the
     same rail the participant gets, with the test estate's own answers. -->
{#snippet questionView(subject: Extract<InspectSubject, { kind: 'question' }>)}
  {#if valid && inspectedQuestion}
    <QuestionInspector
      workbook={valid}
      question={inspectedQuestion}
      parties={estate?.parties ?? []}
      {answers}
      target={subject.target}
    />
  {/if}
{/snippet}

{#snippet floorView()}
  <Hud result={previewResult} workbook={valid} />
{/snippet}

<!-- The scale the QA dashboard's floor is read against, marked with the estate
     on the canvas. -->
{#snippet ladderView()}
  {#if valid}
    <SealLadder sealLevels={valid.sealLevels} floor={evaluation?.result.overall.floor ?? null} />
  {/if}
{/snippet}

{#snippet qaView(subject: QaSubject)}
  <QaInspection {reading} {subject} />
{/snippet}

<InspectorPanel
  {selection}
  {page}
  hint="Click a spoke on the instrument to inspect its questions, grouped by objective."
  views={{
    'instrument-chip': chipView,
    'instrument-reading': readingView,
    objective: objectiveView,
    question: questionView,
    'seal-ladder': ladderView,
    'open-units': qaView,
    'heat-mark': qaView,
    'estate-spoke': qaView,
    'staircase-rung': qaView,
    'dont-know': qaView,
    'consistency-check': qaView,
    contributor: qaView,
    'provenance-fact': qaView,
    evidence: qaView,
    recommendation: qaView,
    'estate-reading': floorView,
  } satisfies InspectorViews}
/>

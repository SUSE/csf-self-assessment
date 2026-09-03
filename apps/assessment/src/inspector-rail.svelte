<script lang="ts">
  import { Hud } from '@csf/platform/ui/hud';
  import { PartialSummary } from '@csf/platform/ui/partial-summary';
  import { QuestionInspector } from '@csf/platform/ui/question-inspector';
  import { SealLadder } from '@csf/platform/ui/workbook-facts';
  import { inspectChip, readingInspection } from '@csf/platform/ui/instrument-wheel';
  import {
    ChipInspection,
    ContributorInspection,
    DontKnowInspection,
    EstateSpokeInspection,
    EvidenceInspection,
    HeatMarkInspection,
    InspectorHint,
    InspectorPanel,
    ObjectiveInspection,
    OpenUnitsInspection,
    ProvenanceInspection,
    ReadingInspection,
    RecommendationInspection,
    SecondLookInspection,
    StaircaseRungInspection,
    getInspector,
    type InspectSubject,
    type InspectorViews,
  } from '@csf/platform/ui/inspector';
  import { FACILITATOR_HINTS } from './facilitator/hints';
  import type { Facilitator } from './facilitator/facilitator.svelte';
  import type { Fill } from './fill/fill.svelte';

  // The rail as data: ONE InspectorPanel and a view per subject kind. A view is one
  // component tag, and anything the panel chooses BETWEEN belongs in the map, never
  // in an `{#if}` here. The selection comes from the session, so nothing is threaded
  // down to whatever did the selecting.
  type Props = {
    fill: Fill;
    facilitator: Facilitator;
    /** What this screen reads when nothing is selected.*/
    page: InspectSubject | null;
  };
  let { fill, facilitator, page }: Props = $props();

  const inspector = getInspector();
  const selection = $derived(inspector?.selection ?? null);

  // Resolve, never store resolved: a selection carries ids only, so a question or a
  // chip the workbook no longer has resolves to null rather than to stale data.
  const workbook = $derived(facilitator.inspectWorkbook);
  const objective = $derived(
    workbook && selection?.kind === 'objective'
      ? (workbook.objectives.find((item) => item.id === selection.objectiveId) ?? null)
      : null,
  );
  const chip = $derived(
    workbook && selection?.kind === 'instrument-chip' ? inspectChip(workbook, selection) : null,
  );
  const reading = $derived(
    workbook && selection?.kind === 'instrument-reading'
      ? readingInspection(workbook, selection.readingId)
      : null,
  );
  // The two personas read different estates: the facilitator's is the merge's estate
  // of record, the participant's is their own slice. Resolved every render, so
  // answering a question moves both the marked rung and the backlog.
  const readWorkbook = $derived(facilitator.active ? workbook : fill.workbook);
  const readResult = $derived(facilitator.active ? facilitator.result : fill.result);
  const readParties = $derived(
    facilitator.active ? facilitator.estateAssessment?.parties ?? [] : fill.allParties,
  );
  const ladderFloor = $derived(readResult?.overall.floor ?? null);
  // A question is selectable on both personas' dashboards, so it resolves against the
  // estate each one reads — a participant has answers of their own and no ledger.
  const readAnswers = $derived(facilitator.active ? facilitator.inspectAnswers : fill.answers);
  const readLedger = $derived(facilitator.active ? facilitator.inspectLedger : []);
  const questionParties = $derived(
    facilitator.active ? facilitator.inspectParties : fill.allParties,
  );
  const question = $derived(
    readWorkbook && selection?.kind === 'question'
      ? (readWorkbook.objectives
          .flatMap((o) => o.questions)
          .find((q) => q.id === selection.questionId) ?? null)
      : null,
  );

  // Where a question opens for the live persona: the facilitator's own rail, the
  // participant's fill surface.
  const openQuestion = (id: string): void => {
    if (facilitator.active) facilitator.inspectQuestion(id);
    else fill.openQuestion(id);
  };
</script>

{#snippet questionView(subject: Extract<InspectSubject, { kind: 'question' }>)}
  {#if readWorkbook && question}
    <QuestionInspector
      workbook={readWorkbook}
      {question}
      parties={questionParties}
      answers={readAnswers}
      ledger={readLedger}
      target={subject.target}
    />
  {:else}
    <InspectorHint text={FACILITATOR_HINTS.questions} />
  {/if}
{/snippet}

{#snippet objectiveView()}
  <ObjectiveInspection
    {objective}
    roles={workbook?.roles ?? []}
    onOpenQuestion={openQuestion}
  />
{/snippet}

<!-- The facilitator's face of the chip view: nothing to manage here, but a question
     still opens in this same rail. -->
{#snippet chipView()}
  <ChipInspection
    inspection={chip}
    onInspectQuestion={(id) => facilitator.inspectQuestion(id)}
  />
{/snippet}

<!-- The facilitator's face: nothing to manage here, so no jump. -->
{#snippet readingView()}
  <ReadingInspection
    inspection={reading}
    onOpenQuestion={(id) => facilitator.inspectQuestion(id)}
  />
{/snippet}

{#snippet ladderView()}
  {#if readWorkbook}
    <SealLadder sealLevels={readWorkbook.sealLevels} floor={ladderFloor} />
  {:else}
    <InspectorHint text="Load an assessment to read the instrument's SEAL scale." />
  {/if}
{/snippet}

{#snippet heatMarkView(subject: Extract<InspectSubject, { kind: 'heat-mark' }>)}
  <HeatMarkInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    axis={subject.axis}
    mark={subject.mark}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet estateSpokeView(subject: Extract<InspectSubject, { kind: 'estate-spoke' }>)}
  <EstateSpokeInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    spokeKey={subject.key}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet openUnitsView(subject: Extract<InspectSubject, { kind: 'open-units' }>)}
  <OpenUnitsInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    group={subject.group}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet dontKnowView()}
  <DontKnowInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet evidenceView(subject: Extract<InspectSubject, { kind: 'evidence' }>)}
  <EvidenceInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    objectiveId={subject.objectiveId}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet contributorView(subject: Extract<InspectSubject, { kind: 'contributor' }>)}
  <ContributorInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    name={subject.name}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet provenanceFactView(subject: Extract<InspectSubject, { kind: 'provenance-fact' }>)}
  <ProvenanceInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    fact={subject.fact}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet consistencyCheckView(subject: Extract<InspectSubject, { kind: 'consistency-check' }>)}
  <SecondLookInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    checkId={subject.checkId}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet staircaseRungView(subject: Extract<InspectSubject, { kind: 'staircase-rung' }>)}
  <StaircaseRungInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    floor={subject.floor}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet recommendationView(subject: Extract<InspectSubject, { kind: 'recommendation' }>)}
  <RecommendationInspection
    result={readResult}
    workbook={readWorkbook}
    parties={readParties}
    recommendationId={subject.recommendationId}
    onOpenQuestion={openQuestion}
  />
{/snippet}

{#snippet estateView()}
  {#if fill.isFinalized}
    <Hud result={fill.result} workbook={fill.workbook} />
  {:else}
    <PartialSummary
      workbook={fill.workbook}
      parties={fill.allParties}
      answers={fill.answers}
      claims={fill.claims}
      onOpenQuestion={openQuestion}
    />
  {/if}
{/snippet}

<InspectorPanel
  {selection}
  {page}
  views={{
    question: questionView,
    objective: objectiveView,
    'instrument-chip': chipView,
    'instrument-reading': readingView,
    'seal-ladder': ladderView,
    'open-units': openUnitsView,
    'heat-mark': heatMarkView,
    'estate-spoke': estateSpokeView,
    'staircase-rung': staircaseRungView,
    'dont-know': dontKnowView,
    'consistency-check': consistencyCheckView,
    contributor: contributorView,
    'provenance-fact': provenanceFactView,
    evidence: evidenceView,
    recommendation: recommendationView,
    'estate-reading': estateView,
  } satisfies InspectorViews}
/>

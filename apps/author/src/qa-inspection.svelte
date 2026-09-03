<script lang="ts">
  import {
    ContributorInspection,
    DontKnowInspection,
    EstateSpokeInspection,
    EvidenceInspection,
    HeatMarkInspection,
    OpenUnitsInspection,
    ProvenanceInspection,
    RecommendationInspection,
    SecondLookInspection,
    StaircaseRungInspection,
  } from '@csf/platform/ui/inspector';
  import type { QaReading, QaSubject } from './qa-rail';

  // Every rail view read against the test estate on the canvas: the same estate
  // reading for all of them, and the subject's own fields on top. The dispatch IS
  // this component's one responsibility.
  type Props = { reading: QaReading; subject: QaSubject };
  let { reading, subject }: Props = $props();
</script>

{#if subject.kind === 'open-units'}
  <OpenUnitsInspection {...reading} group={subject.group} />
{:else if subject.kind === 'heat-mark'}
  <HeatMarkInspection {...reading} axis={subject.axis} mark={subject.mark} />
{:else if subject.kind === 'estate-spoke'}
  <EstateSpokeInspection {...reading} spokeKey={subject.key} />
{:else if subject.kind === 'staircase-rung'}
  <StaircaseRungInspection {...reading} floor={subject.floor} />
{:else if subject.kind === 'dont-know'}
  <DontKnowInspection {...reading} />
{:else if subject.kind === 'consistency-check'}
  <SecondLookInspection {...reading} checkId={subject.checkId} />
{:else if subject.kind === 'contributor'}
  <ContributorInspection {...reading} name={subject.name} />
{:else if subject.kind === 'provenance-fact'}
  <ProvenanceInspection {...reading} fact={subject.fact} />
{:else if subject.kind === 'evidence'}
  <EvidenceInspection {...reading} objectiveId={subject.objectiveId} />
{:else if subject.kind === 'recommendation'}
  <RecommendationInspection {...reading} recommendationId={subject.recommendationId} />
{/if}

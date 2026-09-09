<script lang="ts">
  import type { ReportReading } from '../../report';
  import { FloorReading, HeatGrid, ScoreReading } from '../dashboard';
  import CredibilityReading from './credibility-reading.svelte';
  import DontKnowReading from './dont-know-reading.svelte';
  import EstateWheelReading from './estate-wheel-reading.svelte';
  import EvidenceReading from './evidence-reading.svelte';
  import ExposureReading from './exposure-reading.svelte';
  import ObjectivesReading from './objectives-reading.svelte';
  import SecondLookReading from './second-look-reading.svelte';
  import StaircaseReading from './staircase-reading.svelte';

  type Props = { reading: ReportReading };
  let { reading }: Props = $props();
</script>

{#if reading.id === 'floor'}
  <FloorReading model={reading.model} />
{:else if reading.id === 'score'}
  <ScoreReading model={reading.model} />
{:else if reading.id === 'objectives'}
  <ObjectivesReading model={reading.model} />
{:else if reading.id === 'heat-dimension' || reading.id === 'heat-stratum' || reading.id === 'heat-party' || reading.id === 'heat-role'}
  <HeatGrid view={reading.model} selected={null} tint={false} onSelect={null} />
{:else if reading.id === 'staircase'}
  <StaircaseReading model={reading.model} />
{:else if reading.id === 'exposure'}
  <ExposureReading model={reading.model} />
{:else if reading.id === 'dont-know'}
  <DontKnowReading model={reading.model} />
{:else if reading.id === 'evidence'}
  <EvidenceReading model={reading.model} />
{:else if reading.id === 'worth-a-second-look'}
  <SecondLookReading model={reading.model} />
{:else if reading.id === 'estate-wheel'}
  <EstateWheelReading model={reading.model} />
{:else if reading.id === 'credibility'}
  <CredibilityReading model={reading.model} />
{/if}

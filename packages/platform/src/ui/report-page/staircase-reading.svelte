<script lang="ts">
  import type { StaircaseTile } from '../../analytics';
  import { StaircaseFigure } from '../dashboard';
  import StaircaseStep from './staircase-step.svelte';

  type Props = { model: StaircaseTile };
  let { model }: Props = $props();
</script>

{#if model.kind === 'climb'}
  <p data-staircase-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>
  <figure data-report-figure>
    <StaircaseFigure
      steps={model.steps}
      summitName={model.summitName}
      climb={model.climb}
      selected={null}
      onSelect={null} />
  </figure>
  {#each model.steps as step (step.key)}
    <StaircaseStep {step} />
  {/each}
{:else}
  <p data-staircase-empty class="text-sm text-muted-foreground">{model.reason}</p>
{/if}

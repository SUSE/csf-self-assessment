<script lang="ts">
  import { staircaseTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import StaircaseFigure from './staircase-figure.svelte';

  // The climb, and nothing else: a tread press puts the answers pinning that rung in
  // the rail (ui/inspector's StaircaseRungInspection), so the tile prints no worklist
  // and has nothing left to maximise into.
  let { result, workbook, parties, selected, onSelect }: TileProps = $props();

  const view = $derived(staircaseTile(result, workbook, parties));
</script>

{#if view.kind === 'climb'}
  <p data-staircase-headline class="text-lg font-semibold text-card-foreground">{view.headline}</p>
  <div class="mt-3 max-w-96">
    <StaircaseFigure
      steps={view.steps}
      summitName={view.summitName}
      climb={view.climb}
      {selected}
      {onSelect} />
  </div>
{:else}
  <p data-staircase-empty class="text-sm text-muted-foreground">{view.reason}</p>
{/if}

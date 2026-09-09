<script lang="ts">
  import { secondLookTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import CheckBand from './check-band.svelte';

  // What contradicts itself? Five checks, five dials, always all five — the arc is the
  // share of what each check read that it is asking about, and a check that came back
  // clear is a bare ring rather than an absent one.
  
  // The words are the rail's (ui/inspector/second-look-inspection): rendering them here
  // made five checks the longest object on the dashboard and buried the question that
  // is the point — which is also why this tile has no maximised state.
  let { result, workbook, parties }: TileProps = $props();

  const view = $derived(secondLookTile(result, workbook, parties));
</script>

<p data-second-look-headline class="text-lg font-semibold text-card-foreground">
  {view.kind === 'flagged' ? view.headline : 'Nothing to ask about.'}
</p>

<div class="mt-3">
  <CheckBand {view} />
</div>

{#if view.kind === 'clear'}
  <p data-second-look-empty class="mt-3 text-xs text-muted-foreground">{view.reason}</p>
{/if}

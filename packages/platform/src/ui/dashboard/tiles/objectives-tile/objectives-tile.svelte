<script lang="ts">
  import { objectivesTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import ObjectivesRing from './objectives-ring.svelte';

  // Where weakness coincides with leverage: each objective is a wedge as wide as
  // its authored weight and as long as its SEAL standing. The model owns every
  // string — the headline is the tile's answer in words, the caption is how to
  // read the figure.
  
  // The tile declares `maximises: false` (registry.ts): the ring already labels
  // every wedge with its name and `20% · SEAL-1`, so the four-column table this
  // used to gain maximised restated the figure it sat under.
  let { result, workbook }: TileProps = $props();

  const model = $derived(objectivesTile(result, workbook));
</script>

<p data-objectives-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>

<div data-objectives-ring>
  <ObjectivesRing arcs={model.arcs} rungs={model.rungs} />
</div>

<p data-objectives-caption class="mt-1 text-xs text-muted-foreground">{model.caption}</p>

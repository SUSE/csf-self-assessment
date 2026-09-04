<script lang="ts">
  import { heatTile, type HeatAxisId } from '../../../analytics';
  import type { TileProps } from '../tile-props';
  import HeatGrid from './heat-grid.svelte';

  // One heat grid, pivoted by the axis the wrapper names. Every string and count
  // it renders comes from analytics/heat.ts, which pins them exactly.
  
  // The answers behind a mark are not here: a press inspects the mark and the rail
  // lists them as question rows (ui/inspector's HeatMarkInspection). That is also why
  // the grid has no maximised state — row labels used to be spelled out only there,
  // and they are now spelled out at every width.
  let { result, workbook, parties, selected, onSelect, tint, axis }: TileProps & {
    axis: HeatAxisId;
  } = $props();

  const view = $derived(heatTile(result, workbook, parties, axis));
</script>

<HeatGrid {view} {selected} {tint} {onSelect} />

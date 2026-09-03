<script lang="ts">
  import { estateWheelTile } from '../../../../analytics';
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { TileProps } from '../../tile-props';
  import EstateWheelFigure from './estate-wheel-figure.svelte';

  // Where are we weakest, in one frame? A spoke press keeps the tile's local
  // selection and opens the same ranked answer list in the app-wide Inspector.
  let { result, workbook, parties, selected, onSelect, tint }: TileProps = $props();

  const inspector = getInspector();
  const view = $derived(estateWheelTile(result, workbook, parties));
  const spokes = $derived(view.kind === 'wheel' ? view.spokes : []);

  function selectSpoke(key: string): void {
    onSelect(key);
    inspector?.show({ kind: 'estate-spoke', key });
  }
</script>

{#if view.kind === 'wheel'}
  <p data-estate-headline class="text-lg font-semibold text-card-foreground">{view.headline}</p>
  <EstateWheelFigure {spokes} {selected} {tint} onSelect={selectSpoke} />
  <p data-estate-caption class="mt-2 text-xs text-muted-foreground">{view.caption}</p>
{:else}
  <p data-estate-empty class="text-sm text-muted-foreground">{view.reason}</p>
{/if}

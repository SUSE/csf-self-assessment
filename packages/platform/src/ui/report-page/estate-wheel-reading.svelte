<script lang="ts">
  import type { EstateWheelTile } from '../../analytics';
  import { EstateWheelFigure } from '../dashboard';

  type Props = { model: EstateWheelTile };
  let { model }: Props = $props();
</script>

{#if model.kind === 'wheel'}
  <p data-estate-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>
  <figure data-report-figure>
    <EstateWheelFigure spokes={model.spokes} selected={null} tint={false} onSelect={null} />
  </figure>
  <p data-estate-caption class="mt-2 text-xs text-muted-foreground">{model.caption}</p>
{:else}
  <p data-estate-empty class="text-sm text-muted-foreground">{model.reason}</p>
{/if}

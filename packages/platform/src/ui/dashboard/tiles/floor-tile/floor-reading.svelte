<script lang="ts">
  import type { FloorTile } from '../../../../analytics';
  import { sealInkClass } from '../../../../utils/seal-color';

  // The seal, its holes and the level's authored words. Its own component because
  // the tile renders it both plain and inside the inspecting button.
  type Props = { model: FloorTile };
  let { model }: Props = $props();
</script>

<p
  data-floor-seal
  data-seal={model.standing.kind === 'sealed' ? model.standing.seal : undefined}
  class={`text-3xl font-semibold ${model.standing.kind === 'sealed' ? sealInkClass(model.standing.seal) : 'text-muted-foreground'}`}>
  {model.standing.kind === 'sealed' ? `SEAL-${model.standing.seal}` : '—'}
</p>
{#if model.unknowns > 0}
  <p data-floor-unknowns class="text-xs text-muted-foreground">
    {`${model.unknowns} ${model.unknowns === 1 ? 'unknown' : 'unknowns'}`}
  </p>
{/if}
{#if model.standing.kind === 'sealed'}
  <p data-floor-name class="text-sm font-medium text-card-foreground">{model.standing.name}</p>
  <p data-floor-description class="text-xs text-muted-foreground">{model.standing.description}</p>
{:else}
  <p class="text-xs text-muted-foreground">
    No gating answer yet — the floor appears once a material answer that gates is recorded.
  </p>
{/if}

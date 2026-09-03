<script lang="ts">
  import type { ScoreTile } from '../../../../analytics';
  import { sealInkClass } from '../../../../utils/seal-color';
  import { Gauge } from '../../../gauge';

  type Props = { model: ScoreTile };

  let { model }: Props = $props();

  const arcClass = $derived(
    model.floor === null ? undefined : `fill-current ${sealInkClass(model.floor)}`,
  );
</script>

{#if model.standing.kind === 'scored'}
  <div
    data-score-value
    role="meter"
    aria-label="Score out of 100"
    aria-valuenow={model.standing.score}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuetext={`${model.standing.score.toFixed(1)}%`}
    data-seal={model.floor ?? undefined}>
    <Gauge
      value={model.standing.score}
      label={`${model.standing.score.toFixed(1)}%`}
      minLabel="0"
      maxLabel="100"
      {arcClass} />
  </div>
  <p data-score-note class="text-xs text-muted-foreground">{model.caption}</p>
{:else}
  <p data-score-value class="text-5xl font-semibold tracking-tight text-card-foreground">—</p>
  <p class="text-xs text-muted-foreground">{model.caption}</p>
{/if}

<p data-score-open-material class="mt-2 text-sm text-card-foreground">{model.openNote}</p>

<p class="text-xs text-muted-foreground">
  Adding a party or splitting a dimension adds attainable points and can lower it.
</p>

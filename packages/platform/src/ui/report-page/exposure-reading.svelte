<script lang="ts">
  import type { ExposureTile } from '../../analytics';
  import { sealInkClass } from '../../utils/seal-color';
  import { ExposureMap } from '../dashboard';
  import RatioBar from '../dashboard/ratio-bar.svelte';

  type Props = { model: ExposureTile };
  let { model }: Props = $props();
</script>

{#if model.kind === 'ranked'}
  <p data-exposure-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>
  <figure data-report-figure>
    <ExposureMap map={model.map} selected={null} />
  </figure>
  <ul class="mt-2 flex flex-col gap-1">
    {#each model.ranks as rank (rank.key)}
      <li data-exposure-rank={rank.key} class="flex items-center gap-2 py-1">
        <span class="flex min-w-0 grow flex-col">
          <span class="text-sm text-card-foreground">{rank.name}</span>
          <span class="text-xs text-muted-foreground">{rank.typeName}</span>
          {#if rank.barFraction > 0}
            <RatioBar
              fraction={rank.barFraction}
              fill={rank.worstSeal ?? 'ink'}
              class="mt-1 w-full"
              data-exposure-bar />
          {/if}
        </span>
        <span data-exposure-reach class="shrink-0 text-xs text-muted-foreground">{rank.reach}</span>
        <span
          data-exposure-standing
          data-seal={rank.worstSeal ?? undefined}
          class={`shrink-0 text-xs ${rank.worstSeal === null ? 'text-muted-foreground' : sealInkClass(rank.worstSeal)}`}>
          {rank.standing}
        </span>
      </li>
    {/each}
  </ul>
  <p data-exposure-caption class="mt-2 text-xs text-muted-foreground">{model.caption}</p>
{:else}
  <p data-exposure-empty class="text-sm text-muted-foreground">{model.reason}</p>
{/if}

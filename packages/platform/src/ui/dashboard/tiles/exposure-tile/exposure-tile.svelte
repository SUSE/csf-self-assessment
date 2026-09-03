<script lang="ts">
  import { exposureDetail, exposureMarkKey, exposureTile } from '../../../../analytics';
  import { sealInkClass } from '../../../../utils/seal-color';
  import RatioBar from '../../ratio-bar.svelte';
  import type { TileProps } from '../../tile-props';
  import ExposureMap from './exposure-map.svelte';

  // Who holds a kill switch, and who is under too much of us? Rank is declared
  // reach; the seal beside a party is its own worst party answer.
  let { result, workbook, maximised, selected, onSelect, onOpenQuestion }: TileProps = $props();

  const view = $derived(exposureTile(result, workbook));
  const detail = $derived(
    selected === null ? null : exposureDetail(view, selected, result, workbook),
  );
</script>

{#if view.kind === 'ranked'}
  <p data-exposure-headline class="text-lg font-semibold text-card-foreground">{view.headline}</p>

  {#if maximised}
    <ExposureMap map={view.map} {selected} />
  {/if}

  <ul class="mt-2 flex flex-col gap-1">
    {#each view.ranks as rank (rank.key)}
      <li>
        <button
          type="button"
          data-exposure-rank={rank.key}
          aria-pressed={exposureMarkKey(rank.key) === selected}
          class="flex w-full items-center gap-2 rounded border border-transparent px-1 py-1 text-left hover:bg-muted aria-pressed:border-border aria-pressed:bg-muted"
          onclick={() => onSelect(exposureMarkKey(rank.key))}>
          <span class="flex min-w-0 grow flex-col">
            <span class="truncate text-sm text-card-foreground">{rank.name}</span>
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
            class={`shrink-0 text-xs ${rank.worstSeal !== null ? sealInkClass(rank.worstSeal) : 'text-muted-foreground'}`}
            >{rank.standing}</span>
        </button>
      </li>
    {/each}
  </ul>

  <p data-exposure-caption class="mt-2 text-xs text-muted-foreground">{view.caption}</p>

  {#if maximised && detail !== null}
    <section data-exposure-detail class="mt-4 flex flex-col gap-2 border-t border-border pt-3">
      <h4 data-exposure-detail-title class="text-sm font-medium text-card-foreground">
        {detail.title}
      </h4>
      <p data-exposure-detail-summary class="text-xs text-muted-foreground">{detail.summary}</p>
      <ul class="flex flex-col gap-1">
        {#each detail.rows as row (row.key)}
          <li data-exposure-row class="flex items-start justify-between gap-3 border-t border-border py-1">
            <div class="flex flex-col">
              <p data-exposure-row-question class="text-sm text-card-foreground">{row.questionText}</p>
              <p data-exposure-row-meta class="text-xs text-muted-foreground">{row.meta}</p>
              {#if row.evidence}
                <p data-exposure-row-evidence class="text-xs text-muted-foreground">evidence recorded</p>
              {/if}
            </div>
            <button
              type="button"
              data-open-question={row.questionId}
              class="shrink-0 rounded border border-border px-2 py-1 text-xs text-card-foreground hover:bg-muted"
              onclick={() => onOpenQuestion(row.questionId)}>
              Open this question
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
{:else}
  <p data-exposure-empty class="text-sm text-muted-foreground">{view.reason}</p>
{/if}

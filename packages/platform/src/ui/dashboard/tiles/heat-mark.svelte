<script lang="ts">
  import type { HeatAxisId, HeatMarkView } from '../../../analytics';
  import { provenanceLensClass } from '../../../utils/provenance-lens';
  import { sealSwatchClass } from '../../../utils/seal-color';
  // Deep imports: the inspector barrel pulls the whole rail in with it.
  import { getInspector } from '../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../inspector/subject';

  // One mark on the heat grid — a cell, or the carry mark that closes a row.
  // Every string it shows comes from analytics/heat.ts; the tile owns selection, and
  // the mark's own `title` is its readout.
  //
  // A press does both things it can do: it selects the mark in the tile, and where a
  // session runs it puts the answers behind the mark in the rail. A mark nothing
  // reaches has no answers to show, so it only selects.
  type Props = {
    mark: HeatMarkView;
    /** Carry marks sit outside the grid proper and carry their own probe hook. */
    carry: boolean;
    selected: boolean;
    tint: boolean;
    axis: HeatAxisId;
    onSelect: ((key: string) => void) | null;
  };
  let { mark, carry, selected, tint, axis, onSelect }: Props = $props();

  const provenance = $derived(tint ? (mark.cell?.provenance ?? null) : null);
  const markClass = $derived(
    [
      'flex h-9 w-full flex-col items-center justify-center rounded text-xs',
      mark.cell === null
        ? 'bg-card text-muted-foreground'
        : mark.cell.seal === null
          ? 'border border-dashed border-border text-muted-foreground'
          : sealSwatchClass(mark.cell.seal),
      provenance === null ? '' : provenanceLensClass(provenance),
      mark.cell === null || onSelect === null ? '' : 'cursor-pointer',
    ].join(' '),
  );
  const attrs = $derived({
    ...(carry ? { 'data-heat-carry': '' } : { 'data-heat-cell': '' }),
    'data-mark': mark.key,
    'data-painted': mark.cell === null ? 'false' : 'true',
    'data-seal': mark.cell?.seal ?? undefined,
    'data-provenance': provenance ?? undefined,
    'aria-label': mark.summary,
    title: mark.summary,
    class: markClass,
  });

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({ kind: 'heat-mark', axis, mark: mark.key });

  function press(): void {
    if (onSelect === null) return;
    onSelect(mark.key);
    if (mark.cell !== null) inspector?.show(selection);
  }
</script>

{#snippet body()}
  <span>
    {mark.cell === null ? '·' : mark.cell.seal === null ? '?' : mark.cell.seal}
    {#if mark.cell !== null && mark.cell.seal !== null && mark.cell.unknowns > 0}
      <span class="align-super text-3xs text-muted-foreground">?</span>
    {/if}
  </span>
  {#if mark.stack.length > 0}
    <span data-heat-stack class="flex w-full gap-px px-1">
      {#each mark.stack as segment, i (`${segment.stratum}|${i}`)}
        <span
          data-heat-stack-seg={segment.stratum}
          data-seal={segment.seal}
          title={`${segment.stratum} · SEAL-${segment.seal}`}
          class={`h-1 flex-1 rounded-full ${sealSwatchClass(segment.seal)}`}></span>
      {/each}
    </span>
  {/if}
{/snippet}

{#if onSelect === null}
  <span {...attrs}>{@render body()}</span>
{:else}
  <button type="button" {...attrs} aria-pressed={selected} onclick={press}>{@render body()}</button>
{/if}

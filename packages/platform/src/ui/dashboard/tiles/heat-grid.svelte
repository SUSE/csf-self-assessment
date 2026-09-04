<script lang="ts">
  import type { HeatTileView } from '../../../analytics';
  import HeatHead from './heat-head.svelte';
  import HeatRow from './heat-row.svelte';

  type Props = {
    view: HeatTileView;
    /** The mark selected in this grid, or null. Null is the paper reading: a
     * document has no selection.*/
    selected: string | null;
    tint: boolean;
    /** null = the grid is a static drawing — no press, no inspector, no button
     * semantics. That is what lets the Report import the figure without the
     * dashboard's selection vocabulary (report.md §3.3).*/
    onSelect: ((key: string) => void) | null;
  };
  let { view, selected, tint, onSelect }: Props = $props();
</script>

{#if view.kind === 'empty'}
  <p data-heat-empty class="text-sm text-muted-foreground">{view.reason}</p>
{:else}
  <!-- The grid scrolls in its own box rather than clipping at the card edge: eleven
     dimension columns need ~645px of min-content, which is more than a `half`
     tile gets at any window width. -->
  <div data-heat-scroll class="overflow-x-auto">
    <table class="w-full border-separate border-spacing-1 text-xs">
      <thead>
        <tr>
          <th class="text-left text-muted-foreground"></th>
          {#each view.columns as column (column.key)}
            <HeatHead label={column.label} note={column.note} columnKey={column.key} />
          {/each}
          {#if view.carry.kind === 'carries'}
            <HeatHead label="Carry" note={view.carry.label} carry />
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each view.rows as row (row.key)}
          <HeatRow {row} axis={view.axis} {selected} {tint} {onSelect} />
        {/each}
      </tbody>
    </table>
  </div>
  <p data-heat-caption class="mt-2 text-xs text-muted-foreground">{view.caption}</p>
{/if}

<script lang="ts">
  import type { HeatAxisId, HeatRowView } from '../../../analytics';
  import HeatCell from './heat-cell.svelte';

  // One row of a heat grid: what it is a row about, its cells, and the carry mark
  // that closes it where the axis leaves one.
  type Props = {
    row: HeatRowView;
    axis: HeatAxisId;
    selected: string | null;
    tint: boolean;
    onSelect: ((key: string) => void) | null;
  };
  let { row, axis, selected, tint, onSelect }: Props = $props();
</script>

<tr>
  <th scope="row" class="text-left font-medium text-card-foreground">
    <span class="block">{row.label}</span>
    {#if row.note !== null}
      <span class="block text-3xs font-normal text-muted-foreground">{row.note}</span>
    {/if}
  </th>
  {#each row.cells as cell (cell.key)}
    <HeatCell mark={cell} {axis} {selected} {tint} {onSelect} />
  {/each}
  {#if row.carry !== null}
    <HeatCell mark={row.carry} carry {axis} {selected} {tint} {onSelect} />
  {/if}
</tr>

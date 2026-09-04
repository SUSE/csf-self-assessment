<script lang="ts">
  import CoverageCell from './coverage-cell.svelte';
  import type { CoverageRowModel } from './model';

  // One objective's row of the cross-tab: its id, then its count against every
  // dimension.
  type Props = {
    row: CoverageRowModel;
    /** Open this objective's editor.*/
    onOpen: (objectiveId: string) => void;
  };
  let { row, onOpen }: Props = $props();
</script>

<tr class="border-t border-border/60">
  <th scope="row" class="py-1 pr-2 text-left font-normal">
    <button
      type="button"
      class="block max-w-32 truncate rounded-sm px-1 font-mono text-muted-foreground hover:bg-well hover:text-foreground focus-visible:bg-well focus-visible:outline-none"
      title={`Open ${row.name}`}
      onclick={() => onOpen(row.objectiveId)}
    >{row.objectiveId}</button>
  </th>
  {#each row.cells as cell (cell.dimensionId)}
    <CoverageCell {cell} />
  {/each}
</tr>

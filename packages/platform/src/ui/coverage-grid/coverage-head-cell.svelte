<script lang="ts">
  import type { CoverageColumn } from './model';

  // One dimension's column head. A button, because a column with no question in it
  // is the finding this grid exists to show and the fix is on the Dimensions page.
  type Props = {
    column: CoverageColumn;
    /** Open the Dimensions page with this row flashed.*/
    onOpen: (dimensionId: string) => void;
  };
  let { column, onOpen }: Props = $props();
</script>

<th
  scope="col"
  class="px-1 pb-1 align-bottom font-normal {column.uncovered
    ? 'bg-destructive/10 text-destructive-ink'
    : 'text-muted-foreground'}"
>
  <!-- The id, not a four-character slice of the name: the ids ARE the short
     labels, and a truncated name ('Comp', 'Netw') reads as damage. The full
     name and the state ride the tooltip. -->
  <button
    type="button"
    class="block max-w-32 truncate rounded-sm px-0.5 font-mono hover:bg-well hover:text-foreground focus-visible:bg-well focus-visible:outline-none"
    title={column.uncovered
      ? `${column.name} — no question reaches this dimension`
      : `${column.name} — open Dimensions`}
    onclick={() => onOpen(column.dimensionId)}
  >{column.dimensionId}</button>
</th>

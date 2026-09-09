<script lang="ts">
  import type { CoverageCellModel } from './model';

  // One (objective, dimension) count. Its own component because the cell carries
  // a tinted state, a tooltip sentence and a two-branch glyph, and it is drawn
  // once per dimension per objective — eighty times on the canonical workbook.
  type Props = {
    cell: CoverageCellModel;
  };
  let { cell }: Props = $props();
</script>

<td
  class="px-1 py-1 text-center tabular-nums {cell.uncovered
    ? 'bg-destructive/10 text-destructive-ink'
    : 'text-foreground'}"
  title={cell.title}
>
  <!-- A zero is a dot, not a '0': eighty digits where most are zero reads as a
     wall of noise, and the eye is here to find the ones that are not. -->
  {#if cell.count > 0}
    <span class="font-semibold">{cell.count}</span>
  {:else}
    <span class="text-muted-foreground/40" aria-hidden="true">·</span>
    <span class="sr-only">0</span>
  {/if}
</td>

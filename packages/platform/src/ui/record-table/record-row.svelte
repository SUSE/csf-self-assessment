<script lang="ts" module>
  import type { Snippet } from 'svelte';

  // The `<tr>` every record row wears: the hairline, the hover tint that lets the
  // eye track one record across the table's full width, the deep-link flash, and
  // the cell rhythm. Seven row components asked for exactly this and only differed
  // in their cells — the rhythm is declared here, on the parent, so a row states
  // only what its cells SAY; a cell that wants an alignment still adds its own.
  export type RecordRowProps = {
    /** The record's id, published as `data-highlight` for the wheel deep-link. */
    id: string;
    highlighted?: boolean;
    children: Snippet;
  };
</script>

<script lang="ts">
  let { id, highlighted = false, children }: RecordRowProps = $props();
</script>

<tr
  data-highlight={id}
  class="border-b border-border/40 transition-colors last:border-transparent [&>td]:py-1 [&>td]:pr-3 [&>td:last-child]:pr-0 {highlighted
    ? 'bg-accent'
    : 'hover:bg-muted/40'}"
>
  {@render children()}
</tr>

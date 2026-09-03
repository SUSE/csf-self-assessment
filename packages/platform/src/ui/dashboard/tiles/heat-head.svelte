<script lang="ts">
  // One column heading on a heat grid: what the column is, and the note under it
  // (its gate, its party kind). The carry column wears the same heading.
  type Props = {
    label: string;
    note: string | null;
    /** The carry column is ruled off from the grid proper.*/
    carry?: boolean;
    columnKey?: string | undefined;
  };
  let { label, note, carry = false, columnKey }: Props = $props();
</script>

<th
  data-heat-column={columnKey}
  class={`text-left align-bottom font-medium text-muted-foreground ${carry ? 'border-l border-border pl-2' : ''}`}>
  <span class="block">{label}</span>
  {#if note !== null}
    <span class="block text-3xs font-normal">{note}</span>
  {/if}
</th>

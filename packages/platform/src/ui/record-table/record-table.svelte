<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import type { RecordColumn } from './types';

  // The shell every table of workbook records shares — the author's set-editors
  // (dimensions, roles, party types, test estates) and the facilitator's read-only
  // twins of the same three sets. All of them are "a table of records, one row
  // each"; the editors add at the header and delete at the row. Seven copies of
  // this markup drifted on all of it — table width, column widths, header casing,
  // row rhythm, whether an empty set said anything at all (the read-only tables
  // rendered a bare header) — so the shell is one component and each caller
  // supplies only its columns and its row.
  //
  // The table FILLS the panel and the surplus goes into the fields (`table-fixed`
  // + shares), because the two failure modes are opposite: an auto-layout `w-full`
  // table spends spare width as inter-column padding, and a content-sized table
  // leaves a third of the panel empty while still truncating its longest value.
  export type RecordTableProps = {
    columns: RecordColumn[];
    /** What to say when the set is empty — never render a bare header. */
    empty: string;
    isEmpty: boolean;
    /** The `{#each}` over the set, one row component per record. */
    rows: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  let { columns, empty, isEmpty, rows, class: className }: RecordTableProps = $props();

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
</script>

<!-- `pt-3` on top of the panel's own `space-y-*`: the header's explainer and the
     table are two groups, and 8px reads as one block. Padding, not a margin, so it
     can't trade specificity with the parent's `space-y`. -->
<div class={cn('overflow-x-auto pt-3', className)}>
  <table class="w-full min-w-xl table-fixed text-xs">
    <colgroup>
      {#each columns as column (column.label)}
        <col class={column.width} />
      {/each}
    </colgroup>
    <thead>
      <tr class="border-b border-border text-muted-foreground">
        {#each columns as column, i (column.label)}
          <th
            class={cn(
              'pb-1.5 font-normal',
              alignClass[column.align ?? 'left'],
              i < columns.length - 1 && 'pr-3',
            )}>{column.label}</th
          >
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if isEmpty}
        <tr>
          <td colspan={columns.length} class="py-3 text-muted-foreground">{empty}</td>
        </tr>
      {:else}
        {@render rows()}
      {/if}
    </tbody>
  </table>
</div>

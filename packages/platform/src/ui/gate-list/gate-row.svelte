<script lang="ts">
  import { Chip } from '../chip';
  import type { GateRow } from './model';

  // One question that can floor the whole assessment. The ROW is the control, as
  // it is in every other author list that opens an editor — a row that opens on
  // click does not also need an edit button inside it.
  type Props = {
    row: GateRow;
    onOpen: (questionId: string) => void;
  };
  let { row, onOpen }: Props = $props();
</script>

<li>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-well focus-visible:bg-well focus-visible:outline-none"
    onclick={() => onOpen(row.questionId)}
  >
    <!-- Wide enough for a real question id: at `w-24` every one of the estate
         workbook's ids clipped to `SOV-1.decisi…`, which names nothing. -->
    <span class="w-48 shrink-0 truncate font-mono text-xs text-muted-foreground">{row.questionId}</span>
    <span class="min-w-0 grow truncate text-sm text-foreground" title={row.text}>{row.text}</span>
    <!-- The chips are their own group, right-aligned: as siblings in a wrapping row
         they broke to the FAR LEFT of the next line, under the id, reading as a
         second row belonging to nothing. -->
    <span class="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
      <Chip tone="mono" size="sm" title={`Answered by ${row.roleId}`}>{row.roleName}</Chip>
      {#if row.viaKind === 'party'}
        <Chip tone="neutral" size="sm" title="Gates through the party answers">party</Chip>
      {:else}
        {#each row.dimensionNames as name (name)}
          <Chip tone="neutral" size="sm" title="Gates through this critical dimension">{name}</Chip>
        {/each}
      {/if}
    </span>
  </button>
</li>

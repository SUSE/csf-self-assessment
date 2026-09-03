<script lang="ts">
  import type { TestEstate } from '../../schema';
  import { Input, Textarea } from '../forms';
  import { ConfirmDelete } from '../confirm-delete';
  import { RecordRow } from '../record-table';

  // One reference estate. Its rungs are placed on the question cards, never here,
  // so `answers` is a READING rather than a control — it is the one number that
  // tells the author whether this estate is worth what the HUD spends on it.
  type Props = {
    estate: TestEstate;
    onUpdate: (patch: Partial<TestEstate>) => void;
    onRemove: () => void;
  };
  let { estate, onUpdate, onRemove }: Props = $props();
</script>

<RecordRow id={estate.id}>
  <td class="align-top">
    <Input
      density="compact"
      class="font-mono"
      aria-label={`Estate id ${estate.id}`}
      value={estate.id}
      onchange={(e) => onUpdate({ id: e.currentTarget.value })}
    />
  </td>
  <td class="align-top">
    <Input
      density="compact"
      class="font-medium"
      aria-label={`Estate name ${estate.id}`}
      value={estate.name}
      oninput={(e) => onUpdate({ name: e.currentTarget.value })}
    />
  </td>
  <td class="align-top">
    <!-- The one field here that holds PROSE — an estate's description is a
         paragraph explaining what it is a reference for, and a single-line input
         showed the author about a fifth of it. Three rows fits the estates in the
         flagship workbook whole; longer ones drag taller (`resize-y` comes from
         Textarea — horizontal would break the grid). -->
    <Textarea
      density="compact"
      rows={3}
      aria-label={`Estate description ${estate.id}`}
      placeholder="what this estate is a reference for"
      value={estate.description}
      oninput={(e) => onUpdate({ description: e.currentTarget.value })}
    />
  </td>
  <td class="align-top tabular-nums">
    {#if estate.answers.length > 0}
      {estate.answers.length} placed
    {:else}
      <span class="text-muted-foreground/50">none placed</span>
    {/if}
  </td>
  <td class="align-top text-right">
    <ConfirmDelete label="estate" onconfirm={onRemove} />
  </td>
</RecordRow>

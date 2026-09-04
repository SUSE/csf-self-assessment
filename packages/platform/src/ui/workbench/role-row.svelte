<script lang="ts">
  import type { RoleDef } from '../../schema';
  import { Input } from '../forms';
  import { ConfirmDelete } from '../confirm-delete';
  import { RecordRow } from '../record-table';

  // One answerer role. Two cells answer to the same fact — the questions using this
  // role: the code freezes once any question names it (a rename would orphan them)
  // and the delete is barred for the same reason. The `load` cell is where that fact
  // is STATED, so the barred delete needs no copy of its own. it greys out and the
  // cell titles carry the reason on hover.
  type Props = {
    role: RoleDef;
    /** Question ids naming this role. Non-empty freezes the code AND the delete.*/
    usedBy: string[];
    /** Estimated workshop minutes for this role (roles.md §4).*/
    estimatedMinutes: number;
    onUpdate: (patch: Partial<RoleDef>) => void;
    onRemove: () => void;
  };
  let { role, usedBy, estimatedMinutes, onUpdate, onRemove }: Props = $props();

  const inUse = $derived(usedBy.length > 0);
  const minutes = $derived(
    Number.isInteger(estimatedMinutes) ? String(estimatedMinutes) : estimatedMinutes.toFixed(1),
  );
</script>

<RecordRow id={role.id}>
  <td title={inUse ? `Code frozen — used by ${usedBy.join(', ')}` : undefined}>
    {#if inUse}
      <span class="block truncate px-2 py-1 font-mono text-muted-foreground" data-rule="role"
        >{role.id}</span
      >
    {:else}
      <Input
        density="compact"
        class="font-mono"
        aria-label={`Role code ${role.id}`}
        data-rule="role"
        value={role.id}
        onchange={(e) => onUpdate({ id: e.currentTarget.value })}
      />
    {/if}
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Role name ${role.id}`}
      data-rule="role"
      value={role.name}
      oninput={(e) => onUpdate({ name: e.currentTarget.value })}
    />
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Role description ${role.id}`}
      data-rule="role"
      placeholder="(optional tooltip)"
      value={role.description ?? ''}
      onchange={(e) => onUpdate({ description: e.currentTarget.value })}
    />
  </td>
  <td class="tabular-nums" title={inUse ? usedBy.join(', ') : undefined}>
    {#if inUse}
      {usedBy.length} question{usedBy.length === 1 ? '' : 's'} · ~{minutes} min
    {:else}
      <span class="text-muted-foreground/50">unused</span>
    {/if}
  </td>
  <td
    class="text-right"
    title={inUse ? `Reassign ${usedBy.join(', ')} before deleting` : undefined}
  >
    <ConfirmDelete label="role" disabled={inUse} onconfirm={onRemove} />
  </td>
</RecordRow>

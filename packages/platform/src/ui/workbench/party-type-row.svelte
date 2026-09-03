<script lang="ts">
  import type { PartyType } from '../../schema';
  import { Input } from '../forms';
  import { ConfirmDelete } from '../confirm-delete';
  import { ConfirmAction } from '../confirm-action';
  import { RecordRow } from '../record-table';
  import { PartyKindBadge } from '../workbook-facts';

  // One party type. `kind` is the cell that carries the workbook's single-assessed
  // -party invariant: the assessed type states itself as a chip, and every other
  // type offers to take the role (which demotes the incumbent). That same fact bars
  // the assessed type's delete, so the trash greys out rather than repeating it.
  type Props = {
    party: PartyType;
    /** Flashed when the overview's instrument wheel deep-links to this row. */
    highlighted?: boolean;
    onUpdate: (patch: Partial<PartyType>) => void;
    onMakeAssessed: () => void;
    onRemove: () => void;
  };
  let { party, highlighted = false, onUpdate, onMakeAssessed, onRemove }: Props = $props();

  const assessed = $derived(party.kind === 'assessed');
</script>

<RecordRow id={party.id} {highlighted}>
  <td>
    <Input
      density="compact"
      class="font-mono"
      aria-label={`Party type code ${party.id}`}
      data-rule="party"
      value={party.id}
      onchange={(e) => onUpdate({ id: e.currentTarget.value })}
    />
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Party type name ${party.id}`}
      data-rule="party"
      value={party.name}
      oninput={(e) => onUpdate({ name: e.currentTarget.value })}
    />
  </td>
  <td>
    <Input
      density="compact"
      aria-label={`Party type description ${party.id}`}
      data-rule="party"
      placeholder="(optional tooltip)"
      value={party.description ?? ''}
      onchange={(e) => onUpdate({ description: e.currentTarget.value })}
    />
  </td>
  <td>
    <!-- Both types NAME themselves, so the column reads as one graded set rather
         than a chip on one row and a button on the others; the offer to take the
         role sits after the name it would change. -->
    <div class="flex items-center gap-2">
      <PartyKindBadge kind={party.kind} />
      {#if !assessed}
        <ConfirmAction
          trigger="Make assessed"
          title={`Make “${party.name || party.id}” the assessed party?`}
          body="The current assessed party becomes a third party. Every workbook has exactly one assessed party — the estate owner."
          confirmLabel="Make assessed"
          onconfirm={onMakeAssessed}
        />
      {/if}
    </div>
  </td>
  <td
    class="text-right"
    title={assessed
      ? 'The assessed party can’t be deleted — make another type assessed first.'
      : undefined}
  >
    <ConfirmDelete label="party type" disabled={assessed} onconfirm={onRemove} />
  </td>
</RecordRow>

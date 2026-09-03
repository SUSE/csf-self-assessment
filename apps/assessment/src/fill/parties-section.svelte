<script lang="ts">
  import type { Workbook } from '@csf/platform';
  import { PartyEditor, PartyList } from '@csf/platform/ui/parties-panel';
  import type { Fill } from './fill.svelte';

  // The parties behind this participant's claims: list, or the editor open on one.
  type Props = {
    fill: Fill;
    workbook: Workbook;
  };
  let { fill, workbook }: Props = $props();

  const edit = $derived(fill.partyEdit);
  // A null id means composing a new one, so there is nothing to seed with.
  const editing = $derived.by(() => {
    const open = edit;
    return open === null || open.id === null
      ? undefined
      : fill.partiesAdded.find((p) => p.id === open.id);
  });
</script>

{#if edit !== null}
  <PartyEditor
    {workbook}
    parties={fill.allParties}
    participantName={fill.participant?.name ?? ''}
    initial={editing}
    onSave={(party) => fill.saveParty(party)}
    onBack={() => (fill.partyEdit = null)}
  />
{:else}
  <PartyList
    {workbook}
    parties={fill.parties}
    partiesAdded={fill.partiesAdded}
    claims={fill.claims}
    answers={fill.answers}
    onAdd={() => (fill.partyEdit = { id: null })}
    onEdit={(id) => (fill.partyEdit = { id })}
    onRemove={(id) => fill.removeParty(id)}
  />
{/if}

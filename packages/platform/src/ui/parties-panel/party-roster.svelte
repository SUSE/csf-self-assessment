<script lang="ts">
  import type { Party, Workbook } from '../../schema';
  import { buttonVariants } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import PartyRosterRow from './party-roster-row.svelte';

  // The seeded roster, READ-ONLY — the read-only twin of PartyList, in the same
  // folder so the two faces of a roster can't drift apart. Editing happens wherever
  // the caller says: `onEdit` renders the action that gets there, and omitting it
  // makes this a plain reflection that promises nothing.
  type Props = {
    workbook: Workbook;
    parties: Party[];
    onEdit?: (() => void) | undefined;
    /** Names the page the action opens.*/
    editLabel?: string;
  };
  let { workbook, parties, onEdit, editLabel = 'Edit' }: Props = $props();
</script>

<Panel class="space-y-3">
  <PanelHeader
    title="Parties"
    tone="eyebrow"
    level={2}
    description="The concrete parties seeded for this estate — the roster every participant answers about."
  >
    {#snippet actions()}
      {#if onEdit}
        <button class={buttonVariants({ variant: 'outline', size: 'sm' })} onclick={onEdit}>
          {editLabel}
        </button>
      {/if}
    {/snippet}
  </PanelHeader>
  <ul class="space-y-1">
    {#each parties as party (party.id)}
      <PartyRosterRow {workbook} {party} />
    {/each}
  </ul>
</Panel>

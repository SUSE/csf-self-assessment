<script lang="ts">
  import type { PartyType } from '../../schema';
  import { Panel, PanelHeader } from '../panel';
  import { RecordTable, type RecordColumn } from '../record-table';
  import PartyTypeRow from './party-type-row.svelte';

  // The workbook's party taxonomy, read-only — the twin of ui/workbench's editable
  // Party types panel. These are TYPES, not the estate's concrete parties: a
  // facilitator names the actual providers later, each one of a type declared here.
  type Props = {
    parties: PartyType[];
    title?: string;
  };
  let { parties, title = 'Party types' }: Props = $props();

  const COLUMNS: RecordColumn[] = [
    { label: 'code', width: 'w-[16%]' },
    { label: 'name', width: 'w-[22%]' },
    { label: 'kind', width: 'w-36' },
    { label: 'description' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    {title}
    tone="eyebrow"
    level={2}
    description="The party taxonomy this workbook offers — the assessed party (the estate owner) and the compellable supply chain the exposure map plots."
  />
  <RecordTable
    columns={COLUMNS}
    isEmpty={parties.length === 0}
    empty="This workbook declares no party types."
  >
    {#snippet rows()}
      {#each parties as party (party.id)}
        <PartyTypeRow {party} />
      {/each}
    {/snippet}
  </RecordTable>
</Panel>

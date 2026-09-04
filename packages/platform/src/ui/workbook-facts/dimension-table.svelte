<script lang="ts">
  import type { Dimension } from '../../schema';
  import { Panel, PanelHeader } from '../panel';
  import { RecordTable, type RecordColumn } from '../record-table';
  import DimensionRow from './dimension-row.svelte';

  // The workbook's dimensions, read-only — the twin of ui/workbench's editable
  // Dimensions panel, on the same RecordTable shell and the same column shares, so
  // the reader and the author see one table with and without its inputs.
  type Props = {
    dimensions: Dimension[];
    title?: string;
  };
  let { dimensions, title = 'Dimensions' }: Props = $props();

  // Strata takes the remainder: a strata list is the value that grows. The flag
  // column is fixed — it never widens with the panel.
  const COLUMNS: RecordColumn[] = [
    { label: 'id', width: 'w-[16%]' },
    { label: 'name', width: 'w-[30%]' },
    { label: 'strata' },
    { label: '⚑ critical', width: 'w-20', align: 'center' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    {title}
    tone="eyebrow"
    level={2}
    description="What this instrument's questions are asked about. Strata are the layers within one dimension. A critical dimension is one the SEAL gate reads: its floor caps the whole reading."
  />
  <RecordTable
    columns={COLUMNS}
    isEmpty={dimensions.length === 0}
    empty="This workbook declares no dimensions."
  >
    {#snippet rows()}
      {#each dimensions as dimension (dimension.id)}
        <DimensionRow {dimension} />
      {/each}
    {/snippet}
  </RecordTable>
</Panel>

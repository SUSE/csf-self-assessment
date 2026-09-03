<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { addDimension, removeDimension, setStrata, updateDimension } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { IssueList } from '../forms';
  import DimensionRow from './dimension-row.svelte';
  import { RecordTable, type RecordColumn } from '../record-table';

  // The workbench's Dimensions focus: the table of dimensions with their strata
  // and the critical flag. It holds NO edit logic and NO validation — pure ops
  // build the next draft, and the strict issues under `dimensions` arrive
  // pre-computed from the stage. RecordTable owns the table shell. this file is
  // the columns, the copy and the wiring.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    /** A row id to flash when the overview's instrument wheel deep-links here.*/
    highlight?: string | null;
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, highlight = null, onDraft }: Props = $props();

  const ownIssues = $derived(issuesUnder(issues, ['dimensions']));

  // Strata takes the remainder (no width): a strata list is the value that grows.
  // The checkbox and the delete are fixed — a control never widens with the panel,
  // and these two must never be the columns that give way.
  const COLUMNS: RecordColumn[] = [
    { label: 'id', width: 'w-[16%]' },
    { label: 'name', width: 'w-[30%]' },
    { label: 'strata' },
    { label: 'critical', width: 'w-16', align: 'center' },
    { label: '', width: 'w-12' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    title="Dimensions"
    tone="eyebrow"
    level={2}
    description="The estate's dimensions — what a question can be asked about. Strata are the layers within one dimension, entered comma-separated. A critical dimension is one the SEAL gate reads: its floor caps the whole reading."
  >
    {#snippet actions()}<Button variant="outline" onclick={() => onDraft(addDimension(draft))}>+ Dimension</Button>{/snippet}
  </PanelHeader>
  <RecordTable
    columns={COLUMNS}
    isEmpty={draft.dimensions.length === 0}
    empty="No dimensions yet. Every question is asked about one, so add the first before writing questions."
  >
    {#snippet rows()}
      {#each draft.dimensions as d (d.id)}
        <DimensionRow
          dimension={d}
          highlighted={highlight === d.id}
          onUpdate={(patch) => onDraft(updateDimension(draft, d.id, patch))}
          onStrata={(strata) => onDraft(setStrata(draft, d.id, strata))}
          onRemove={() => onDraft(removeDimension(draft, d.id))}
        />
      {/each}
    {/snippet}
  </RecordTable>
  <IssueList issues={ownIssues} />
</Panel>

<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { addTestEstate, removeTestEstate, updateTestEstate } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { IssueList } from '../forms';
  import TestEstateRow from './test-estate-row.svelte';
  import { RecordTable, type RecordColumn } from '../record-table';

  // The workbench's Test estates focus: the reference estates the HUD evaluates
  // on every edit. It holds NO edit logic and NO validation — pure ops build the
  // next draft, and the strict issues under `testEstates` arrive pre-computed
  // from the stage. The estate's answers are placed on the question cards, not
  // here. this panel only counts them.
  
  // It reads as a table like every other set editor, rather than one Well per
  // estate: the records carry the same three fields plus one reading, and stacked
  // cards made three identical fields land at three different x-positions with the
  // count on a line of its own.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, onDraft }: Props = $props();

  const ownIssues = $derived(issuesUnder(issues, ['testEstates']));

  const COLUMNS: RecordColumn[] = [
    { label: 'id', width: 'w-[15%]' },
    { label: 'name', width: 'w-[22%]' },
    { label: 'description' },
    { label: 'answers', width: 'w-32' },
    { label: '', width: 'w-12' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    title="Test estates"
    tone="eyebrow"
    level={2}
    description="Reference estates the HUD evaluates on every edit, so a change to a rung shows its consequence immediately. Place each estate's honest rung on the question cards — not here."
  >
    {#snippet actions()}<Button variant="outline" onclick={() => onDraft(addTestEstate(draft))}>+ Test estate</Button>{/snippet}
  </PanelHeader>
  <RecordTable
    columns={COLUMNS}
    isEmpty={draft.testEstates.length === 0}
    empty="No test estates yet. Add one to see what your questions read against a known estate."
  >
    {#snippet rows()}
      {#each draft.testEstates as estate (estate.id)}
        <TestEstateRow
          {estate}
          onUpdate={(patch) => onDraft(updateTestEstate(draft, estate.id, patch))}
          onRemove={() => onDraft(removeTestEstate(draft, estate.id))}
        />
      {/each}
    {/snippet}
  </RecordTable>
  <IssueList issues={ownIssues} />
</Panel>

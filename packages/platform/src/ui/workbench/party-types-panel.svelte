<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { addParty, removeParty, setAssessedParty, updateParty } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { IssueList } from '../forms';
  import PartyTypeRow from './party-type-row.svelte';
  import { RecordTable, type RecordColumn } from '../record-table';

  // The workbench's Parties focus: the party taxonomy this workbook offers. It
  // holds NO edit logic and NO validation — pure ops build the next draft, and
  // the strict issues under `parties` arrive pre-computed from the stage.
  // Exactly one type carries kind 'assessed'; that one can't be deleted.
  // RecordTable owns the table shell; this file is the columns, copy and wiring.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    /** A row id to flash when the overview's instrument wheel deep-links here. */
    highlight?: string | null;
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, highlight = null, onDraft }: Props = $props();

  const ownIssues = $derived(issuesUnder(issues, ['parties']));

  // Description takes the remainder; `kind` is fixed because it holds a chip and a
  // button, and the delete is fixed because it holds an icon button. Neither widens
  // with the panel, and neither may be what gives way when it narrows.
  const COLUMNS: RecordColumn[] = [
    { label: 'code', width: 'w-[15%]' },
    { label: 'name', width: 'w-[22%]' },
    { label: 'description' },
    { label: 'kind', width: 'w-64' },
    { label: '', width: 'w-12' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    title="Party types"
    tone="eyebrow"
    level={2}
    description="The party taxonomy this workbook offers — the assessed party (the estate owner) and the compellable supply chain the exposure map plots. Exactly one type is the assessed party; codes, names, descriptions and that flag all edit freely, and only the assessed type cannot be deleted."
  >
    {#snippet actions()}<Button variant="outline" onclick={() => onDraft(addParty(draft))}>+ Party type</Button>{/snippet}
  </PanelHeader>
  <RecordTable
    columns={COLUMNS}
    isEmpty={draft.parties.length === 0}
    empty="No party types yet. The assessed party is the estate owner, so add that one first."
  >
    {#snippet rows()}
      {#each draft.parties as p (p.id)}
        <PartyTypeRow
          party={p}
          highlighted={highlight === p.id}
          onUpdate={(patch) => onDraft(updateParty(draft, p.id, patch))}
          onMakeAssessed={() => onDraft(setAssessedParty(draft, p.id))}
          onRemove={() => onDraft(removeParty(draft, p.id))}
        />
      {/each}
    {/snippet}
  </RecordTable>
  <IssueList issues={ownIssues} />
</Panel>

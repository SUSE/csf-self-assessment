<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { addRole, authorGauges, questionsUsingRole, removeRole, updateRole } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { IssueList } from '../forms';
  import RoleRow from './role-row.svelte';
  import { RecordTable, type RecordColumn } from '../record-table';

  // The workbench's Roles focus: the answerer roles this workbook offers. It
  // holds NO edit logic and NO validation — pure ops build the next draft, and
  // the strict issues under `roles` arrive pre-computed from the stage. A role's
  // code freezes and its delete is blocked once a question uses it. RecordTable
  // owns the table shell; this file is the columns, the copy and the wiring.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, onDraft }: Props = $props();

  const ownIssues = $derived(issuesUnder(issues, ['roles']));

  // The role READOUT (docs/specs/roles.md §4): question count and estimated
  // workshop minutes per role. It was the Author HUD's own section; the minutes are
  // the part no other surface said, and they belong on the page where roles are
  // assigned rather than in a rail. Informational — it makes load visible and flags
  // nothing overloaded or unbalanced (invariant #6).
  const loads = $derived(
    new Map(authorGauges(draft).roleReadout.loads.map((l) => [l.role, l])),
  );

  // Description takes the remainder — it's the free-text value that grows. `load`
  // is a fixed measurement column and the delete a fixed control: neither widens
  // with the panel, and neither may be what gives way when it narrows.
  const COLUMNS: RecordColumn[] = [
    { label: 'code', width: 'w-[16%]' },
    { label: 'name', width: 'w-[26%]' },
    { label: 'description' },
    { label: 'load', width: 'w-44' },
    { label: '', width: 'w-12' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    title="Roles"
    tone="eyebrow"
    level={2}
    description="The answerer roles this workbook offers. The code is the badge on question cards; it stays editable until a question uses the role, then it freezes — and a role in use cannot be deleted, so reassign its questions first."
  >
    {#snippet actions()}<Button variant="outline" onclick={() => onDraft(addRole(draft))}>+ Role</Button>{/snippet}
  </PanelHeader>
  <RecordTable
    columns={COLUMNS}
    isEmpty={draft.roles.length === 0}
    empty="No roles yet. Every question is answered by one, so add the first before writing questions."
  >
    {#snippet rows()}
      {#each draft.roles as r (r.id)}
        <RoleRow
          role={r}
          usedBy={questionsUsingRole(draft, r.id)}
          estimatedMinutes={loads.get(r.id)?.estimatedMinutes ?? 0}
          onUpdate={(patch) => onDraft(updateRole(draft, r.id, patch))}
          onRemove={() => onDraft(removeRole(draft, r.id))}
        />
      {/each}
    {/snippet}
  </RecordTable>
  <IssueList issues={ownIssues} />
</Panel>

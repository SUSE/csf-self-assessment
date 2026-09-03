<script lang="ts">
  import type { RoleDef } from '../../schema';
  import { Panel, PanelHeader } from '../panel';
  import { RecordTable, type RecordColumn } from '../record-table';
  import RoleRow from './role-row.svelte';

  // The workbook's answerer roles, read-only — the twin of ui/workbench's editable
  // Roles panel. The author's table carries a `load` column (questions × minutes);
  // that is a reading of the DRAFT being shaped, not a fact of the workbook, so a
  // reader's table stops at the description.
  type Props = {
    roles: RoleDef[];
    title?: string;
  };
  let { roles, title = 'Roles' }: Props = $props();

  const COLUMNS: RecordColumn[] = [
    { label: 'code', width: 'w-[16%]' },
    { label: 'name', width: 'w-[30%]' },
    { label: 'description' },
  ];
</script>

<Panel class="space-y-2">
  <PanelHeader
    {title}
    tone="eyebrow"
    level={2}
    description="Who a question is asked of. Every question names one role, and a participant answers the questions their role owns."
  />
  <RecordTable
    columns={COLUMNS}
    isEmpty={roles.length === 0}
    empty="This workbook declares no roles."
  >
    {#snippet rows()}
      {#each roles as role (role.id)}
        <RoleRow {role} />
      {/each}
    {/snippet}
  </RecordTable>
</Panel>

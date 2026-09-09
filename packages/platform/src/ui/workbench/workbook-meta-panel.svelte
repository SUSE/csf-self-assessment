<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { setWorkbookMeta } from '../../author';
  import { DetailsCard } from '../details-card';
  import { IssueList } from '../forms';
  import MetaField from './meta-field.svelte';
  import { META_FIELDS, metaValue } from '../workbook-facts/meta-fields';

  // The workbook's identity strip on the overview: id, version, title. It holds no
  // edit logic and no validation — a pure op builds the next draft (design rule 1),
  // and the strict issues under `meta` arrive pre-computed (design rule 3).
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
  };
  let { draft, issues, onDraft }: Props = $props();
</script>

<DetailsCard title="Workbook">
  {#snippet fields()}
    {#each META_FIELDS as spec (spec.label)}
      <MetaField
        {spec}
        value={metaValue(draft.meta, spec.label)}
        onCommit={(value) => onDraft(setWorkbookMeta(draft, { [spec.label]: value }))}
      />
    {/each}
  {/snippet}
  {#snippet footer()}
    <IssueList issues={issuesUnder(issues, ['meta'])} />
  {/snippet}
</DetailsCard>

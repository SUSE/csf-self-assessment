<script lang="ts">
  import type { WorkbookMeta } from '../../schema';
  import { DetailsCard, DetailField } from '../details-card';
  import { META_FIELDS, metaValue } from './meta-fields';

  // The workbook's identity strip, read-only: the twin of ui/workbench's
  // MetaField card, driven by the SAME META_FIELDS list so the two faces of one
  // fact cannot drift on face or width.
  type Props = {
    meta: WorkbookMeta;
    title?: string;
  };
  let { meta, title = 'Workbook' }: Props = $props();
</script>

<DetailsCard {title}>
  {#snippet fields()}
    {#each META_FIELDS as spec (spec.label)}
      <DetailField
        label={spec.label}
        value={metaValue(meta, spec.label)}
        mono={spec.mono}
        grow={spec.grow}
        class={spec.fieldClass}
      />
    {/each}
  {/snippet}
</DetailsCard>

<script lang="ts">
  import type { Workbook } from '@csf/platform';
  import { ClaimEditor, ClaimList } from '@csf/platform/ui/claim-bar';
  import type { Fill } from './fill.svelte';

  // The slices of the estate this participant is answering for: list, or the editor
  // open on one. Twin of the Parties section.
  type Props = {
    fill: Fill;
    workbook: Workbook;
  };
  let { fill, workbook }: Props = $props();

  const edit = $derived(fill.claimEdit);
  // A null index means composing a new one, so there is nothing to seed with.
  const editing = $derived.by(() => {
    const open = edit;
    return open === null || open.index === null ? undefined : fill.claims[open.index];
  });
</script>

{#if edit !== null}
  <ClaimEditor
    {workbook}
    parties={fill.allParties}
    initial={editing}
    onSave={(claim) => fill.saveClaim(claim)}
    onBack={() => (fill.claimEdit = null)}
  />
{:else}
  <ClaimList
    {workbook}
    parties={fill.allParties}
    answers={fill.answers}
    claims={fill.claims}
    activeIndex={fill.activeClaimIndex}
    onAdd={() => (fill.claimEdit = { index: null })}
    onEdit={(i) => (fill.claimEdit = { index: i })}
    onToggleActive={(i) => fill.selectClaim(fill.activeClaimIndex === i ? -1 : i)}
    onRemove={(i) => fill.removeClaim(i)}
  />
{/if}

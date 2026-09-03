<script lang="ts">
  import { Dashboard } from '@csf/platform/ui/dashboard';
  import type { Facilitator } from './facilitator.svelte';

  // The same Dashboard the participant reads, over the merge's estate of record.
  type Props = {
    facilitator: Facilitator;
  };
  let { facilitator }: Props = $props();

  const estate = $derived(facilitator.estateAssessment);
  const result = $derived(facilitator.result);
</script>

{#if estate && result}
  <Dashboard
    {result}
    workbook={estate.workbook}
    parties={estate.parties}
    maximised={facilitator.maximisedTile}
    onMaximise={(id) => (facilitator.maximisedTile = id)}
    onOpenQuestion={(id) => facilitator.inspectQuestion(id)}
  />
{:else}
  <p class="mx-auto max-w-3xl text-sm text-muted-foreground">
    Nothing has landed yet. Add a returned partial in Merge — the dashboard reads
    the estate as it stands.
  </p>
{/if}

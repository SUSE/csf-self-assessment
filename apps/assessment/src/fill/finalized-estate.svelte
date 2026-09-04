<script lang="ts">
  import type { Workbook } from '@csf/platform';
  import { Dashboard } from '@csf/platform/ui/dashboard';
  import { FillSurface } from '@csf/platform/ui/fill-surface';
  import type { Fill } from './fill.svelte';

  // A FINALIZED estate read whole — no claims, no sectioned answering, so it keeps a
  // single centred column and the header's Fill/Read is the only switch.
  type Props = {
    fill: Fill;
    workbook: Workbook;
    estate: string;
  };
  let { fill, workbook, estate }: Props = $props();
</script>

<div>
  <h2 class="text-lg font-semibold text-foreground">{estate}</h2>
  <p class="text-xs text-muted-foreground">
    {workbook.dimensions.length} dimension{workbook.dimensions.length === 1 ? '' : 's'} in scope
  </p>
</div>

{#if fill.mode === 'read'}
  {#if fill.result}
    <Dashboard
      result={fill.result}
      {workbook}
      parties={fill.allParties}
      maximised={fill.maximisedTile}
      onMaximise={(id) => (fill.maximisedTile = id)}
      onOpenQuestion={(id) => fill.openQuestion(id)}
    />
  {/if}
{:else}
  <FillSurface
    {workbook}
    parties={fill.walkParties}
    answers={fill.answers}
    sections={fill.sections}
    focusId={fill.focusId}
    onChange={(next) => (fill.answers = next)}
    onFocus={(id) => (fill.focusId = id)}
  />
{/if}

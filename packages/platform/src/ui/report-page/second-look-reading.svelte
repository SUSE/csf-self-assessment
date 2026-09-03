<script lang="ts">
  import type { SecondLookTile } from '../../analytics';
  import { CheckBand } from '../dashboard';
  import SecondLookCheck from './second-look-check.svelte';

  // The tile's five dials, then the words the tile leaves to the rail.
  type Props = { model: SecondLookTile };
  let { model }: Props = $props();
</script>

<p data-second-look-headline class="text-lg font-semibold text-card-foreground">
  {model.kind === 'flagged' ? model.headline : 'Nothing to ask about.'}
</p>

<div data-report-figure class="mt-3">
  <CheckBand view={model} />
</div>

{#if model.kind === 'flagged'}
  <div class="mt-4 flex flex-col gap-4">
    {#each model.checks as check, i (check.id)}
      <SecondLookCheck {check} index={i + 1} />
    {/each}
  </div>
{:else}
  <p data-second-look-clear class="mt-3 text-sm text-muted-foreground">{model.reason}</p>
{/if}

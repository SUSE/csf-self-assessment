<script lang="ts">
  import { evidenceTile } from '../../../../analytics';
  // Deep imports, not the inspector barrel: it pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';
  import RatioBar from '../../ratio-bar.svelte';
  import type { TileProps } from '../../tile-props';
  import ObjectiveStrip from './objective-strip.svelte';

  // Could we defend this to a reviewer? Coverage over the gating answers, then where
  // the debt sits. The bar encodes a ratio, never a seal.
  
  // The questions themselves are the rail's reading — a second reading, not a second
  // size of this one. The headline presses through to all of them. each badge to its
  // own objective's share, which is why the strip sits outside the headline's button.
  let { result, workbook, parties }: TileProps = $props();

  const view = $derived(evidenceTile(result, workbook, parties));

  const inspector = getInspector();
  const selection: InspectSelection = { kind: 'evidence', objectiveId: null };
  const showing = $derived(inspector?.isShowing(selection) ?? false);
</script>

{#if view.kind === 'covered'}
  {#if inspector}
    <button
      type="button"
      data-evidence-inspect
      aria-pressed={showing}
      title="Every gating answer with no document behind it"
      onclick={() => inspector.show(selection)}
      class="flex w-full cursor-pointer flex-col items-stretch rounded-md text-left focus-visible:outline-2 focus-visible:outline-foreground">
      <p data-evidence-headline class="text-lg font-semibold text-card-foreground">
        {view.headline}
      </p>
    </button>
  {:else}
    <p data-evidence-headline class="text-lg font-semibold text-card-foreground">{view.headline}</p>
  {/if}
  <RatioBar
    fraction={view.barFraction}
    fill={view.floor ?? 'ink'}
    class="mt-2 w-full"
    data-evidence-bar />
  <div class="mt-3">
    <ObjectiveStrip
      objectives={view.undefendedByObjective}
      label={view.undefendedLabel}
      pressable={inspector !== null} />
  </div>
  <p data-evidence-caption class="mt-3 text-xs text-muted-foreground">{view.caption}</p>
{:else}
  <p data-evidence-empty class="text-sm text-muted-foreground">{view.reason}</p>
{/if}

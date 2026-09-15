<script lang="ts">
  import type { ProvenanceFact } from '../../../../analytics';
  // Deep imports, not the inspector barrel: it pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';
  import RatioBar from '../../ratio-bar.svelte';

  // One provenance ratio: what it describes, what it measures, and the share drawn
  // under it. Two lines, whatever the estate — the sentence these replace grew with
  // the numbers in it and wrapped to three at a third of the row.
  
  // The whole row is the hit target. where no session runs it is plain text, never a
  // control that no-ops.
  let {
    label,
    value,
    fraction,
    mark,
  }: {
    label: string;
    /** The measurement in words — `9 of 84 · 10.7%`.*/
    value: string;
    fraction: number;
    /** Which ratio this is: the `data-credibility-*` hook AND the rail's own id.*/
    mark: ProvenanceFact;
  } = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({ kind: 'provenance-fact', fact: mark });
  const showing = $derived(inspector?.isShowing(selection) ?? false);
</script>

{#snippet body()}
  <p class="flex items-baseline justify-between gap-2 text-xs">
    <span class="text-card-foreground">{label}</span>
    <span class="shrink-0 text-muted-foreground tabular-nums">{value}</span>
  </p>
  <!-- The measured part takes the series colour, so the reading is the coloured
     run rather than a grey bar the eye has to compare against its own track. -->
  <RatioBar {fraction} fill="series" class="mt-1 w-full" data-credibility-bar={mark} />
{/snippet}

{#if inspector}
  <button
    type="button"
    data-credibility-fact={mark}
    aria-pressed={showing}
    title={`The answers behind “${label}”`}
    onclick={() => inspector.show(selection)}
    class={`-mx-1 block w-full cursor-pointer rounded-sm px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-foreground ${
      showing ? 'bg-muted' : 'hover:bg-muted'
    }`}>
    {@render body()}
  </button>
{:else}
  <div data-credibility-fact={mark}>{@render body()}</div>
{/if}

<script lang="ts">
  import { dontKnowTile } from '../../../../analytics';
  // Deep imports, not the inspector barrel: it pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';
  import type { TileProps } from '../../tile-props';
  import AdmittedReading from './admitted-reading.svelte';
  import EmptyReading from './empty-reading.svelte';

  // What do we admit we don't know? Floor holes lead. the rest are counted but move no
  // number. A don't-know is neither a seal nor absence — no seal colour.
  
  // Pressing the reading puts the admitted units in the rail, which is what this tile
  // has instead of a maximised state. With no session it is plain marks.
  let { result, workbook, parties }: TileProps = $props();

  const view = $derived(dontKnowTile(result, workbook, parties));
  const caption = $derived(view.kind === 'admitted' ? view.caption : view.reason);

  const inspector = getInspector();
  const selection: InspectSelection = { kind: 'dont-know' };
  const showing = $derived(inspector?.isShowing(selection) ?? false);
</script>

<!-- The affordance is the cursor, not a box — a border here reads as a field. Focus
     draws, because a keyboard reader has no cursor to go by. -->
{#if view.kind === 'none'}
  <EmptyReading {view} />
{:else if inspector}
  <button
    type="button"
    data-dont-know-inspect
    aria-pressed={showing}
    title="What we admit we don’t know"
    onclick={() => inspector.show(selection)}
    class="flex w-full cursor-pointer flex-col items-stretch rounded-md text-left focus-visible:outline-2 focus-visible:outline-foreground">
    <AdmittedReading {view} />
  </button>
{:else}
  <AdmittedReading {view} />
{/if}

<p data-dont-know-caption class="mt-3 text-xs text-muted-foreground">{caption}</p>

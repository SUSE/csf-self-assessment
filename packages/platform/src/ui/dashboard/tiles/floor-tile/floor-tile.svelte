<script lang="ts">
  import { floorTile } from '../../../../analytics';
  // Deep imports, not the inspector barrel: it pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';
  import type { TileProps } from '../../tile-props';
  import FloorReading from './floor-reading.svelte';

  // What we are: the floor, its authored level, and the holes that could still drop
  // it. Absence is never a zero (analytics).
  
  // Pressing the reading puts the authored SEAL ladder in the rail, which is what
  // the tile has instead of a maximised state. With no session it is plain marks.
  let { result, workbook }: TileProps = $props();

  const model = $derived(floorTile(result, workbook));

  const inspector = getInspector();
  const selection: InspectSelection = { kind: 'seal-ladder' };
  const showing = $derived(inspector?.isShowing(selection) ?? false);

  function inspect(): void {
    inspector?.show(selection);
  }
</script>

<!-- The affordance is the cursor, not a box — a border here reads as a field. Focus
     draws, because a keyboard reader has no cursor to go by. -->
{#if inspector}
  <button
    type="button"
    data-floor-inspect
    aria-pressed={showing}
    title="What the SEAL levels mean"
    onclick={inspect}
    class="flex cursor-pointer flex-col items-start gap-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-foreground">
    <FloorReading {model} />
  </button>
{:else}
  <FloorReading {model} />
{/if}

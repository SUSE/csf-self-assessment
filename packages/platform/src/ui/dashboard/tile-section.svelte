<script lang="ts" generics="T extends TileHolder">
  import type { Snippet } from 'svelte';
  import { SECTION_TITLE } from '../../analytics';
  import ProvenanceToggle from './provenance-toggle.svelte';
  import type { TileHolder, TileSectionGroup } from './sections';
  import TileRow from './tile-row.svelte';

  // One section of the dashboard: its heading, the tint control when this is the
  // heading that carries it, and the tiles under it.
  
  // The control is placed by the dashboard, which is the only thing that can see
  // all the sections at once and pick the FIRST one holding a tile the control
  // bites on — so this component is told, never asked.
  let {
    group,
    tint,
    onTint,
    showTint = false,
    tile,
  }: {
    group: TileSectionGroup<T>;
    tint: boolean;
    onTint: () => void;
    showTint?: boolean;
    tile: Snippet<[T]>;
  } = $props();
</script>

<section class="flex flex-col gap-3" data-tile-section={group.section}>
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {SECTION_TITLE[group.section]}
    </h2>
    {#if showTint}
      <ProvenanceToggle {tint} onToggle={onTint} />
    {/if}
  </div>
  <TileRow tiles={group.tiles} {tile} />
</section>

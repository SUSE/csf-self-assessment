<script lang="ts">
  import { Maximize2, Minimize2 } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { tileMaximises, type TileDef } from '../../analytics';
  import { Panel } from '../panel';

  // The chrome every tile wears: its title, the question it answers (rendered,
  // not decorative — analytics §2.4, it is what earns the tile its place), and
  // the maximise/reset control where the tile declares one. A tile whose grid
  // body is its whole reading gets no button rather than a button that only
  // enlarges it (`maximises` in analytics/tiles.ts). The tile body arrives as
  // `children`.
  //
  // The frame is a query container, and on this surface that is the only correct
  // input: the same tile renders at a sixth, a half and a whole row
  // (tile-width.ts) and maximised, and both side panels change its width without
  // the viewport moving. A body that reflows reads the width it actually got.
  let {
    def,
    maximised,
    onToggle,
    children,
  }: {
    def: TileDef;
    maximised: boolean;
    onToggle: () => void;
    children: Snippet;
  } = $props();
</script>

<Panel data-tile={def.id} class="@container flex h-full flex-col gap-2">
  <header class="flex items-start justify-between gap-2">
    <div>
      <h3 class="text-sm font-semibold text-card-foreground">{def.title}</h3>
      <p class="text-xs text-muted-foreground">{def.asks}</p>
    </div>
    {#if tileMaximises(def)}
      <button
        type="button"
        data-maximise={def.id}
        aria-label={`${maximised ? 'Reset' : 'Maximise'} ${def.title}`}
        onclick={onToggle}
        class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground">
        {#if maximised}
          <Minimize2 class="size-4" />
        {:else}
          <Maximize2 class="size-4" />
        {/if}
      </button>
    {/if}
  </header>
  {@render children()}
</Panel>

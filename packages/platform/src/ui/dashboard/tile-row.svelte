<script lang="ts" generics="T extends TileHolder">
  import type { Snippet } from 'svelte';
  import { tileColumns, type TileHolder } from './sections';
  import { tileStyle } from './tile-width';

  // One wrapping row of tiles, and the whole of the dashboard's placement
  // mechanism (tile-width.ts explains the six-column module and why not five).
  
  // Every tile in a section goes into ONE of these — the rows the reader sees
  // are wrap lines the browser computed, not groups this component made. That is
  // the point: there is no row model to keep in step with the registry, and no
  // breakpoint deciding how many fit, so the dashboard reflows on the width it
  // actually has. Both side panels collapse 18rem → 3rem without the viewport
  // moving, which a media query cannot see at all.
  let { tiles, tile }: { tiles: readonly T[]; tile: Snippet<[T]> } = $props();

  // A cell holds one tile, or a column of tiles that declared they are read under
  // it. A stacked column hugs whatever its leading tile said, so both cards end
  // at their content and the surplus stays air in the column.
  const columns = $derived(tileColumns(tiles));
</script>

<div class="tile-row" data-tile-row>
  {#each columns as column (column[0]!.def.id)}
    <div
      class="tile-cell"
      class:tile-cell--grow={column[0]!.def.grow === true}
      data-tile-cell={column[0]!.def.id}
      data-tile-width={column[0]!.def.width}
      style={tileStyle(column.length > 1 ? { ...column[0]!.def, hug: true } : column[0]!.def)}>
      {#each column as entry (entry.def.id)}{@render tile(entry)}{/each}
    </div>
  {/each}
</div>

<style>
  .tile-row {
    --tile-gap: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: var(--tile-gap);
    /* Row height is the tallest tile in it; the shorter ones fill (`h-full` on
       the tile itself) unless they declared `hug`, which `--tile-cross` carries
       per cell. A row span is still refused — it would reserve a second row the
       tiles beside it cannot reach, which is how the tall `objectives` figure
       used to leave a hole under `floor` and `score`. */
    align-items: stretch;
    /* The Symmetric-Remainder Rule. A row that does not divide evenly is settled
       twice over: `--grow` tiles absorb the remainder first, and anything left
       becomes equal air on both sides rather than dead space dumped on the
       right. A row that divides exactly — four halves, three thirds — never
       sees this. */
    justify-content: center;
  }

  .tile-cell {
    /* A column, so a cell that holds two tiles reads them top-down at one share.
       With one tile it changes nothing: the card is told to fill the cell. */
    display: flex;
    flex-direction: column;
    gap: var(--tile-gap);
    /* The declared share, exactly: with n tiles summing to six columns, the
       bases and the (n-1) gaps add up to 100% at any container width. */
    --tile-share: calc(var(--tile-cols) / 6 * (100% + var(--tile-gap)) - var(--tile-gap));
    /* `max()` is the responsive mechanism, and the only one. Wide container: the
       share wins. Narrow: the floor wins, exceeds what the line can hold, and
       the row wraps — flex breaks lines on the basis before it shrinks anything,
       so tiles wrap instead of squashing. No breakpoint is consulted. */
    flex-basis: max(var(--tile-min), var(--tile-share));
    flex-grow: 0;
    flex-shrink: 1;
    /* A floor wider than the container clamps rather than overflowing the page —
       the shell is `overflow-hidden` and would have no scrollbar to offer. */
    max-width: 100%;
    /* Tiles hold pivot tables and long labels; without this a body's intrinsic
       width would win over the share it was given. */
    min-width: 0;
    /* The third declaration from `tileStyle`: `stretch` to fill the row's height,
       `start` for a tile that declared `hug` — its card ends at its content and
       the surplus becomes air in the column instead of air inside the card. It is
       a keyword, never a length, so it holds at any container width. Still not a
       row span: the freed height stays unreachable, which is the point. */
    align-self: var(--tile-cross, stretch);
  }

  .tile-cell--grow {
    flex-grow: 1;
  }
</style>

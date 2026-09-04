<script lang="ts">
  import { whatsLeftTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import OwnerChips from './owner-chips.svelte';
  import WhatsLeftRail from './whats-left-rail.svelte';

  // What is still unanswered, and whose job it is: the population as one cell per
  // unit (unit-field) with the open ones in amber, and the owners beside it.
  
  // No maximised ledger. The open units ARE questions, and a question is read in the
  // right rail everywhere else here, so a chip press inspects its owner instead.
  
  // One wrapping band: rail and chips both claim a 16rem basis, so they sit side by
  // side above 32rem of content and stack below it. Nothing reads the viewport — the
  // side panels collapse and change this tile's width without the window moving.
  const REST_GROUPS = 4;
  const BAND = 'flex flex-wrap items-start gap-x-6 gap-y-4';

  let { result, workbook, parties }: TileProps = $props();

  const model = $derived(whatsLeftTile(result, workbook, parties));
  const shown = $derived(model.groups.slice(0, REST_GROUPS));
  const hidden = $derived(model.groups.length - shown.length);
</script>

{#if model.open === 0}
  <p data-whats-left-empty class="text-sm text-muted-foreground">
    Nothing open — every unit in scope carries an answer.
  </p>
{:else}
  <div class={BAND}>
    <WhatsLeftRail total={model.total} open={model.open} />
    <OwnerChips groups={shown} {hidden} />
  </div>
{/if}

<script lang="ts">
  import type { OpenGroup } from '../../../../analytics';
  import OwnerChip from './owner-chip.svelte';

  // Who holds what is left, largest first. The overflow chip reads the whole chase,
  // which is how the owners past the fourth stay reachable.
  
  // `flex-[3_1_16rem]` against the rail's `1`: both stack below 32rem of band, and
  // above it the surplus goes to the chips rather than to a wider count.
  const LEDGER = 'flex min-w-0 flex-[3_1_16rem] flex-wrap content-start gap-1.5';

  let { groups, hidden }: { groups: OpenGroup[]; hidden: number } = $props();
</script>

<div data-whats-left-owners class={LEDGER}>
  {#each groups as group, i (group.key)}
    <!-- The largest owner carries the amber: the tile's answer is "start here". -->
    <OwnerChip
      group={group.key}
      tone={i === 0 ? 'attention' : 'muted'}
      title={`Open questions on ${group.label}`}>
      <span data-whats-left-group={group.key}>{group.label}</span>
      <span class="tabular-nums opacity-70">{group.units.length}</span>
    </OwnerChip>
  {/each}
  {#if hidden > 0}
    <OwnerChip group={null} tone="neutral" title="Every owner, and the questions open on each">
      <span data-whats-left-overflow>{`+${hidden} more`}</span>
    </OwnerChip>
  {/if}
</div>

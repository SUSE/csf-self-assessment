<script lang="ts">
  import { Inset } from '../panel';
  import { Chip } from '../chip';
  import { SealBadge } from '../seal-badge';
  import StratumChip from './stratum-chip.svelte';
  import type { DimensionCoverage } from './model';

  // One dimension a dimension-grain question fans over: its selected seal (when an
  // assessment is loaded), id, name, the critical ⚑ that gates the floor, and the
  // strata within — each with its own seal when the dimension was split, or bare
  // when it was answered whole. `showSeal` is false for a bare workbook, where a
  // badge would read as broken.
  type Props = { dimension: DimensionCoverage; showSeal: boolean };
  let { dimension, showSeal }: Props = $props();
</script>

<Inset as="li" density="none" class="space-y-1 rounded-md px-2 py-1.5">
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
    {#if showSeal}<SealBadge seal={dimension.seal} />{/if}
    <span class="font-mono text-3xs text-muted-foreground">{dimension.id}</span>
    <span class="min-w-0 flex-1 truncate text-xs text-foreground">{dimension.name}</span>
    {#if dimension.critical}
      <Chip tone="attention" size="sm" title="Critical — gates the floor">
        {#snippet icon()}<span aria-hidden="true">⚑</span>{/snippet}
        critical
      </Chip>
    {/if}
  </div>
  {#if dimension.strataSeals.length > 0}
    <div class="flex flex-wrap gap-1 pl-8">
      {#each dimension.strataSeals as s (s.stratum)}
        <StratumChip stratum={s.stratum} seal={s.seal} />
      {/each}
    </div>
  {:else if dimension.strata.length > 0}
    <div class="flex flex-wrap gap-1 pl-8">
      {#each dimension.strata as s (s)}
        <StratumChip stratum={s} />
      {/each}
    </div>
  {/if}
</Inset>

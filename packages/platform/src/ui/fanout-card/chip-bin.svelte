<script lang="ts">
  import type { Chip, RenderGroup } from './types';
  import RenderGroupChip from './render-group-chip.svelte';

  // One bin's worth of chips — the tray, a rung, or an off-ladder row. The key
  // expression and the prop set live here once, so the four bins cannot drift.
  type Props = {
    groups: RenderGroup[];
    activeKey: string | null;
    onTap: (chip: Chip) => void;
    onSplit: (chip: Chip) => void;
    onMerge: (unitKey: string) => void;
  };
  let { groups, activeKey, onTap, onSplit, onMerge }: Props = $props();
</script>

{#each groups as g (g.grouped ? g.unitKey : g.chip.key)}
  <RenderGroupChip group={g} {activeKey} {onTap} {onSplit} {onMerge} />
{/each}

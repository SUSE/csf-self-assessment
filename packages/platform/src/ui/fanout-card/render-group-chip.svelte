<script lang="ts">
  import { TrayChip } from '../unit-tray';
  import type { Chip, RenderGroup } from './types';

  // One render group as a chip: a split dimension as a segmented pill, else a
  // plain chip. Rendered by the tray, every rung and every off-ladder row — the
  // card keeps the placement state and only says which chip is selected.
  type Props = {
    group: RenderGroup;
    activeKey: string | null;
    onTap: (chip: Chip) => void;
    onSplit: (chip: Chip) => void;
    onMerge: (unitKey: string) => void;
  };
  let { group, activeKey, onTap, onSplit, onMerge }: Props = $props();

  const segment = (c: Chip, label: string) => ({
    key: c.key,
    label,
    dragPayload: c,
    state: c.answer?.state ?? null,
    selected: c.key === activeKey,
    onSelect: () => onTap(c),
  });
</script>

{#if group.grouped}
  <TrayChip
    critical={group.critical}
    grouped
    name={group.name}
    fraction={group.fraction}
    onMerge={() => onMerge(group.unitKey)}
    segments={group.segs.map((c) => segment(c, c.short))}
  />
{:else}
  <TrayChip
    critical={group.chip.critical}
    splittable={group.chip.splittable}
    count={group.strataCount}
    onSplit={() => onSplit(group.chip)}
    segments={[segment(group.chip, group.chip.label)]}
  />
{/if}

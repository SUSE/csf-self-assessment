<script lang="ts">
  import { cn } from '../../utils/cn';
  import SegmentedButton from './segmented-button.svelte';
  import { segmentedStripVariants } from './variants';
  import type { SegmentedItem } from './types';

  // A segmented strip of destinations, model-driven: the items are a list the host
  // owns, so adding one is a row rather than another block of markup. Exactly one
  // segment reads as current, and each one SHOWS its own view — never a single
  // button that flips between two.
  type Props = {
    items: SegmentedItem[];
    /** The `id` of the segment whose view is showing.*/
    active: string;
    onSelect: (id: string) => void;
    /** Names the strip for assistive tech — 'Mode', 'Right panel'.*/
    label: string;
    /** `tablist` when the strip switches PANES inside the region below it (the
     * right rail). `group` when each segment is a destination that changes the
     * stage (the mode switch, the QA estate picker).*/
    as?: 'tablist' | 'group';
    grow?: boolean;
    class?: string;
  };
  let {
    items,
    active,
    onSelect,
    label,
    as = 'group',
    grow = false,
    class: className,
  }: Props = $props();
</script>

<div class={cn(segmentedStripVariants({ grow }), className)} role={as} aria-label={label}>
  {#each items as item (item.id)}
    <SegmentedButton
      {item}
      {grow}
      active={item.id === active}
      tab={as === 'tablist'}
      onSelect={() => onSelect(item.id)}
    />
  {/each}
</div>

<script lang="ts">
  import { segmentedItemVariants } from './variants';
  import type { SegmentedItem } from './types';

  // One segment. Its own component because the strip's buttons were three
  // identical eight-line blocks per strip in the Author shell, differing only by
  // label and by which state they compared against.
  type Props = {
    item: SegmentedItem;
    active: boolean;
    /** The strip is a tabs widget, so state is `aria-selected` on a `role=tab`. */
    tab: boolean;
    grow: boolean;
    onSelect: () => void;
  };
  let { item, active, tab, grow, onSelect }: Props = $props();

  // Built as an object and SPREAD, so switching a11y vocabulary does not fork this
  // into two near-identical buttons: a tab announces itself selected, a
  // destination announces itself pressed.
  const state = $derived<Record<string, unknown>>(
    tab ? { role: 'tab', 'aria-selected': active } : { 'aria-pressed': active },
  );
</script>

<button
  type="button"
  class={segmentedItemVariants({ active, grow })}
  disabled={item.disabled}
  title={item.title}
  {...state}
  {...item.data}
  onclick={onSelect}
>{item.label}</button>

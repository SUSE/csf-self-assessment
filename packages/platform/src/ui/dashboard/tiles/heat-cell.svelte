<script lang="ts">
  import type { HeatAxisId, HeatMarkView } from '../../../analytics';
  import HeatMark from './heat-mark.svelte';

  // A grid position: the cell and the carry mark that closes a row differ only in
  // the rule that separates the carry from the grid proper.
  type Props = {
    mark: HeatMarkView;
    carry?: boolean;
    axis: HeatAxisId;
    selected: string | null;
    tint: boolean;
    onSelect: ((key: string) => void) | null;
  };
  let { mark, carry = false, axis, selected, tint, onSelect }: Props = $props();
</script>

<td class={carry ? 'border-l border-border pl-2' : undefined}>
  <HeatMark {mark} {carry} selected={mark.key === selected} {tint} {axis} {onSelect} />
</td>

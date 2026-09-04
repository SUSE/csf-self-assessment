<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import { inputVariants, type InputDensity } from './variants';

  // The styled native select. It exists because three editors hand-rolled
  // `rounded border border-border bg-background px-2 py-1 text-xs` — a fixed
  // 4px radius and a size down from Input's — so a select standing next to an
  // `Input density="compact"` in the same row read as a different control from a
  // different system. Sharing `inputVariants` makes them the same box.
  
  // Native on purpose: a target list can run to every question in the workbook,
  // and the platform's own listbox handles that better than anything reimplemented
  // here. Where the choice needs more than a string per row, reach for a popover
  // instead (see recommendation-link-picker).
  type Props = HTMLSelectAttributes & {
    density?: InputDensity;
    invalid?: boolean;
    children: Snippet;
  };

  let {
    density = 'default',
    invalid = false,
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<select class={cn(inputVariants({ density, invalid }), className)} {...rest}>
  {@render children()}
</select>

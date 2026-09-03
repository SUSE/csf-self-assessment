<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';

  // One segment. Inactive = muted; active (bits-ui sets data-state="on") = accent.
  // Mirrors the hand-rolled segmented control this component replaces.
  type Props = {
    ref?: HTMLButtonElement | null;
    value: string;
    disabled?: boolean;
    class?: string;
    /** For a segment whose visible text is abbreviated (a bare digit, a label
     *  plus a count) — the full name a screen reader should read. */
    'aria-label'?: string;
    children: Snippet;
  };

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<ToggleGroupPrimitive.Item
  bind:ref
  class={cn(
    'cursor-pointer rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-accent data-[state=on]:font-medium data-[state=on]:text-foreground',
    className,
  )}
  {...restProps}
>
  {@render children()}
</ToggleGroupPrimitive.Item>

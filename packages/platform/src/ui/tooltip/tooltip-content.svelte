<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Tooltip content, wired to our design tokens. A tooltip is chrome,
  // not a good/done outcome, so it is NEUTRAL, never `bg-primary` green (invariant #3
  // — green means SEAL-3/4 and completion, nothing structural): the classic inverted
  // `bg-foreground` / `text-background` chip, high-contrast and hue-free in both
  // themes. Portalled so it is never clipped by the header's overflow. Types come
  // straight from bits-ui (v2).
  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 6,
    children,
    ...restProps
  }: TooltipPrimitive.ContentProps = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    {sideOffset}
    class={cn(
      'z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>

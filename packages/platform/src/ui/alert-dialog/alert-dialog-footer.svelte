<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/cn';

  // shadcn-svelte AlertDialog footer — right-aligns the action buttons on wide
  // viewports, stacks them (action on top) when the card is narrow.
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
  } = $props();
</script>

<div
  bind:this={ref}
  data-slot="alert-dialog-footer"
  class={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
  {...restProps}
>
  {@render children?.()}
</div>

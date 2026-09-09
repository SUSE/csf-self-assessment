<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/cn';

  // shadcn-svelte AlertDialog header — stacks the title above the description.
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
  data-slot="alert-dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-left', className)}
  {...restProps}
>
  {@render children?.()}
</div>

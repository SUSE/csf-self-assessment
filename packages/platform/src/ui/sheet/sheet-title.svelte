<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Sheet title (labels the panel for assistive tech). Twin of
  // dialog-title.
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
  bind:ref
  data-slot="sheet-title"
  class={cn('text-lg font-semibold text-foreground', className)}
  {...restProps}
/>

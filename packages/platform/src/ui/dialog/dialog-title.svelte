<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Dialog title (labels the dialog for assistive tech). Twin of
  // alert-dialog-title.
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.TitleProps = $props();
</script>

<DialogPrimitive.Title
  bind:ref
  data-slot="dialog-title"
  class={cn('text-lg font-semibold text-foreground', className)}
  {...restProps}
/>

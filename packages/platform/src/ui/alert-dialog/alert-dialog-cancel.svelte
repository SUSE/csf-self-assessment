<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { buttonVariants } from '../button';
  import { cn } from '../../utils/cn';

  // shadcn-svelte AlertDialog cancel — the dismissing button (outline styling).
  // Closes the dialog on click, like the underlying primitive.
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AlertDialogPrimitive.CancelProps = $props();
</script>

<AlertDialogPrimitive.Cancel
  bind:ref
  data-slot="alert-dialog-cancel"
  class={cn(buttonVariants({ variant: 'outline' }), className)}
  {...restProps}
/>

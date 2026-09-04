<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte AlertDialog overlay — the dimmed scrim behind the dialog.
  // (shadcn's enter/exit `data-[state]` animation utilities need the
  // tw-animate-css plugin, which this repo does not load, so they are omitted —
  // the scrim appears instantly.)
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AlertDialogPrimitive.OverlayProps = $props();
</script>

<AlertDialogPrimitive.Overlay
  bind:ref
  data-slot="alert-dialog-overlay"
  class={cn('fixed inset-0 z-50 bg-black/50', className)}
  {...restProps}
/>

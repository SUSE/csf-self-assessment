<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Dialog overlay — the dimmed scrim behind the dialog. Twin of
  // alert-dialog-overlay. the plain Dialog (role="dialog", light-dismiss) rather
  // than the interruptive AlertDialog. (No enter/exit animation utilities — this
  // repo does not load tw-animate-css, so the scrim appears instantly.)
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
  bind:ref
  data-slot="dialog-overlay"
  class={cn('fixed inset-0 z-50 bg-black/50', className)}
  {...restProps}
/>

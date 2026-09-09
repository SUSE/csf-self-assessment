<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import X from '@lucide/svelte/icons/x';
  import DialogOverlay from './dialog-overlay.svelte';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Dialog content — the centered card, portalled over the overlay
  // so it is never clipped by app layout. Twin of alert-dialog-content, with a
  // light-dismiss Close (✕) in the corner: the plain Dialog is dismissible
  // (outside-click / Esc), unlike the AlertDialog which must be answered.
  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    ...restProps
  }: DialogPrimitive.ContentProps & {
    portalProps?: DialogPrimitive.PortalProps;
  } = $props();
</script>

<DialogPrimitive.Portal {...portalProps}>
  <DialogOverlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg sm:max-w-lg',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
    <DialogPrimitive.Close
      class="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <X class="size-4" />
      <span class="sr-only">Close</span>
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
</DialogPrimitive.Portal>

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import AlertDialogOverlay from './alert-dialog-overlay.svelte';
  import { cn } from '../../utils/cn';

  // shadcn-svelte AlertDialog content — the centered card, portalled over the
  // overlay so it is never clipped by app layout. Styled with the design tokens
  // (bg-background / border / shadow) like the rest of the shadcn layer.
  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    ...restProps
  }: AlertDialogPrimitive.ContentProps & {
    portalProps?: AlertDialogPrimitive.PortalProps;
  } = $props();
</script>

<AlertDialogPrimitive.Portal {...portalProps}>
  <AlertDialogOverlay />
  <AlertDialogPrimitive.Content
    bind:ref
    data-slot="alert-dialog-content"
    class={cn(
      'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg sm:max-w-lg',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>

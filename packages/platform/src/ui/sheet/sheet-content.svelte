<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import X from '@lucide/svelte/icons/x';
  import SheetOverlay from './sheet-overlay.svelte';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Sheet content — the side-anchored panel, portalled over the
  // overlay so it is never clipped by app layout. Twin of dialog-content, anchored
  // to one edge instead of centred. (No enter/exit animation utilities — this repo
  // does not load tw-animate-css, so the panel appears instantly.)
  let {
    ref = $bindable(null),
    class: className,
    side = 'right',
    portalProps,
    children,
    ...restProps
  }: DialogPrimitive.ContentProps & {
    /** Which edge the panel is anchored to.*/
    side?: 'top' | 'bottom' | 'left' | 'right';
    portalProps?: DialogPrimitive.PortalProps;
  } = $props();

  const ANCHORS = {
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r',
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l',
    top: 'inset-x-0 top-0 h-auto border-b',
    bottom: 'inset-x-0 bottom-0 h-auto border-t',
  } as const;
</script>

<DialogPrimitive.Portal {...portalProps}>
  <SheetOverlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="sheet-content"
    data-side={side}
    class={cn(
      'fixed z-50 flex flex-col gap-4 overflow-y-auto border-border bg-background p-6 shadow-lg',
      ANCHORS[side],
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

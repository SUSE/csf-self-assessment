<script lang="ts">
  import { Popover as PopoverPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Popover content — an ANCHORED panel portalled next to its
  // trigger (floating-ui positions it, so it never centers), light-dismiss on
  // outside-click / Esc. Use this for anchored popups (the question-nav map); a
  // CENTERED modal is ui/alert-dialog. Base surface only — children set their own
  // text colours (popover-foreground is a muted token, so we don't blanket it).
  let {
    ref = $bindable(null),
    class: className,
    side = 'bottom',
    align = 'start',
    sideOffset = 6,
    portalProps,
    children,
    ...restProps
  }: PopoverPrimitive.ContentProps & {
    portalProps?: PopoverPrimitive.PortalProps;
  } = $props();
</script>

<PopoverPrimitive.Portal {...portalProps}>
  <PopoverPrimitive.Content
    bind:ref
    {side}
    {align}
    {sideOffset}
    data-slot="popover-content"
    class={cn(
      'z-50 rounded-lg border border-border bg-popover p-4 text-foreground shadow-md outline-none',
      className,
    )}
    {...restProps}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Portal>

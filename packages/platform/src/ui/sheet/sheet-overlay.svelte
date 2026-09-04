<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // shadcn-svelte Sheet overlay — the dimmed scrim behind the side-anchored panel.
  // Twin of dialog-overlay. the same light-dismiss Dialog primitive. (No
  // enter/exit animation utilities — this repo does not load tw-animate-css, so
  // the scrim appears instantly.)
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
  bind:ref
  data-slot="sheet-overlay"
  class={cn('fixed inset-0 z-50 bg-black/50', className)}
  {...restProps}
/>

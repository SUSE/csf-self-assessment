<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';

  // The disclosure's control. bits-ui renders its OWN `<button>` and owns
  // `aria-expanded` / `aria-controls`, so pass the button recipe as classes
  // (`buttonVariants({ variant: 'ghost', size: 'icon' })`) rather than wrapping a
  // `<Button>` — the same rule as Popover.Trigger.
  let { ref = $bindable(null), ...restProps }: CollapsiblePrimitive.TriggerProps = $props();
</script>

<CollapsiblePrimitive.Trigger bind:ref data-slot="collapsible-trigger" {...restProps} />

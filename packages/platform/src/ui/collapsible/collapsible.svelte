<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';

  // shadcn-svelte Collapsible root — an IN-FLOW disclosure: the trigger and the
  // content stay in the document, so nothing is portalled and nothing casts a
  // shadow. Use this when a panel has a detail reading behind one control (the
  // landing checks' bindings). for an ANCHORED popup use ui/popover, for a
  // CENTERED modal ui/alert-dialog. `open` is bindable, so the owner keeps the
  // state and this component keeps none.
  let {
    ref = $bindable(null),
    open = $bindable(false),
    ...restProps
  }: CollapsiblePrimitive.RootProps = $props();
</script>

<CollapsiblePrimitive.Root bind:ref bind:open data-slot="collapsible" {...restProps} />

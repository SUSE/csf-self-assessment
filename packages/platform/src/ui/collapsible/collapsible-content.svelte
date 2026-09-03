<script lang="ts">
  import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // The revealed detail. Unstyled apart from the base outline reset — the caller
  // owns spacing, because this sits inside whatever section opened it. No height
  // animation: theme.css declares no collapsible keyframes, and the system's
  // motion budget is spent on the stage carousel.
  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: CollapsiblePrimitive.ContentProps = $props();
</script>

<CollapsiblePrimitive.Content
  bind:ref
  data-slot="collapsible-content"
  class={cn('outline-none', className)}
  {...restProps}
>
  {@render children?.()}
</CollapsiblePrimitive.Content>

<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // The group. One value, one selection, roving tabindex over every Item inside
  // it — including Items rendered by a child component (SealSelector), because
  // bits-ui carries the group through context rather than through the DOM shape.
  // That is what lets a list of rows and a segmented strip be ONE radio group.
  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(''),
    ...restProps
  }: RadioGroupPrimitive.RootProps = $props();
</script>

<RadioGroupPrimitive.Root
  bind:ref
  bind:value
  data-slot="radio-group"
  class={cn('grid w-full gap-2', className)}
  {...restProps}
/>

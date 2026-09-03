<script lang="ts">
  import { Label as LabelPrimitive } from 'bits-ui';
  import { cn } from '../../utils/cn';

  // A `<label for>` that carries a control's words. bits-ui adds the disabled
  // propagation; the type scale stays the caller's business, because a radio row
  // and a field caption are not the same size.
  //
  // The pointer is on by default: a label FOR a control is part of that control's
  // hit area — clicking it presses the radio — so it must not look inert. A
  // caption over a text field can pass `cursor-text` (or `cursor-default`) to
  // override, since `cn` resolves the conflict last-wins.
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
  bind:ref
  data-slot="label"
  class={cn(
    'flex cursor-pointer items-center gap-2 leading-none select-none',
    'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
    'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className,
  )}
  {...restProps}
/>

<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '../../utils/cn';
  import { inputVariants, type InputDensity } from './variants';

  // The styled text input primitive. Use it directly when you need just the
  // control (e.g. an inline row); reach for TextField when you want the whole
  // label + input + help/validation stack. `invalid` paints the red outline;
  // `readonly`/`disabled` inherit the inert muted look from theme.css.
  type Props = HTMLInputAttributes & {
    value?: string;
    density?: InputDensity;
    invalid?: boolean;
  };

  let {
    value = $bindable(''),
    density = 'default',
    invalid = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<input
  class={cn(inputVariants({ density, invalid }), className)}
  bind:value
  {...rest}
/>

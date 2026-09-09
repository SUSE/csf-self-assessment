<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '../../utils/cn';
  import { inputVariants, type InputDensity } from './variants';

  // The styled multi-line control, twin of Input and sharing its variants so a
  // note field and a text field cannot drift apart. Reach for it wherever the
  // value is prose the writer may want to see whole — a facilitator's note, a
  // question's `why` — and for a labelled stack wrap it the way TextField wraps
  // Input. `readonly`/`disabled` inherit the inert muted look from theme.css.
  type Props = HTMLTextareaAttributes & {
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

<!-- `resize-y` only: a textarea that can be dragged wider breaks whatever grid it
     sits in, but growing it downward costs its neighbours nothing. -->
<textarea class={cn(inputVariants({ density, invalid }), 'resize-y', className)} bind:value {...rest}
></textarea>

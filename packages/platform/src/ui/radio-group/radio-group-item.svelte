<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '../../utils/cn';

  // The dot. Selection is the filled circle. focus is the thick ring, per the
  // theme's one-thick-ring rule. A cell-shaped member of the same group is
  // ui/seal-selector, not a variant here — this one is always the dot.
  
  // The state hook is `data-[state=checked]`, NOT `data-checked`: this bits-ui
  // (2.18) sets `data-state="checked"|"unchecked"`, while the shadcn-svelte
  // registry snippet is written against a build that sets a bare `data-checked`.
  // A `data-checked:` utility here compiles fine and simply never matches — the
  // dot stays hollow while `aria-checked` is correct. Verified in the DOM.
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> = $props();
</script>

<RadioGroupPrimitive.Item
  bind:ref
  data-slot="radio-group-item"
  class={cn(
    'peer relative flex aspect-square size-4 shrink-0 cursor-pointer rounded-full border border-input outline-none transition-colors',
    'after:absolute after:-inset-x-3 after:-inset-y-2',
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...restProps}
>
  {#snippet children({ checked })}
    {#if checked}
      <span
        data-slot="radio-group-indicator"
        class="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground"
      ></span>
    {/if}
  {/snippet}
</RadioGroupPrimitive.Item>

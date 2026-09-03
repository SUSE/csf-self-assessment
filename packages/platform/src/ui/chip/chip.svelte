<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import type { SurfaceAttributes } from '../panel/attributes';
  import { chipVariants, type ChipSize, type ChipTone } from './variants';

  export type ChipProps = SurfaceAttributes & {
    as?: string;
    tone?: ChipTone;
    size?: ChipSize;
    /** A leading glyph — a state icon, a status dot. Decorative: the word beside
     *  it is always the carrier, so callers mark it `aria-hidden`. */
    icon?: Snippet;
  };
</script>

<script lang="ts">
  let {
    as = 'span',
    class: className,
    tone = 'neutral',
    size = 'default',
    icon,
    ref = $bindable(null),
    children,
    ...rest
  }: ChipProps = $props();
</script>

<svelte:element
  this={as}
  bind:this={ref}
  data-slot="chip"
  class={cn(chipVariants({ tone, size }), className)}
  {...rest}
>
  {@render icon?.()}
  {@render children?.()}
</svelte:element>

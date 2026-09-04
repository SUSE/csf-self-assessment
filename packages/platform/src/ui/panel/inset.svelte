<script lang="ts" module>
  import { cn } from '../../utils/cn';
  import type { SurfaceAttributes } from './attributes';
  import { surfaceVariants, type SurfaceDensity, type SurfaceTone } from './variants';

  // One value inside a card: a candidate answer, a before/after reading, a
  // disclosure row. Fill only, no border — at this depth another ring of hairline
  // turns a card into a grid of boxes.
  
  // Same parent rule as Well: `--well` is derived from `--card`, so an Inset is
  // only legal inside a Panel or a Card.
  export type InsetProps = SurfaceAttributes & {
    as?: string;
    tone?: SurfaceTone;
    density?: SurfaceDensity;
  };
</script>

<script lang="ts">
  let {
    as = 'div',
    class: className,
    tone = 'default',
    density = 'md',
    ref = $bindable(null),
    children,
    ...rest
  }: InsetProps = $props();
</script>

<svelte:element
  this={as}
  bind:this={ref}
  data-slot="inset"
  class={cn(surfaceVariants({ depth: 'inset', tone, density }), className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>

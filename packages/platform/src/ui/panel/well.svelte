<script lang="ts" module>
  import { cn } from '../../utils/cn';
  import type { SurfaceAttributes } from './attributes';
  import { surfaceVariants, type SurfaceDensity, type SurfaceTone } from './variants';

  // A compartment cut INTO a panel, holding several cards.
  
  // Only legal on a `bg-card` surface — inside a Panel or a Card. `--well` is
  // derived from `--card`, so a Well laid straight on the canvas steps away from
  // a parent it does not have. A quiet region on the canvas is
  // `<Panel tone="quiet">`.
  export type WellProps = SurfaceAttributes & {
    as?: string;
    tone?: SurfaceTone;
    density?: SurfaceDensity;
  };
</script>

<script lang="ts">
  let {
    as = 'section',
    class: className,
    tone = 'default',
    density = 'md',
    ref = $bindable(null),
    children,
    ...rest
  }: WellProps = $props();
</script>

<svelte:element
  this={as}
  bind:this={ref}
  data-slot="well"
  class={cn(surfaceVariants({ depth: 'well', tone, density }), className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>

<script lang="ts" module>
  import { cn } from '../../utils/cn';
  import type { SurfaceAttributes } from './attributes';
  import {
    surfaceVariants,
    type SurfaceDensity,
    type SurfaceState,
    type SurfaceTone,
  } from './variants';

  // The object a person reads and acts on. Sits UP out of a well, back at the
  // panel's own surface.
  
  // `state` is the one place a surface carries meaning: `open` puts `--warning`
  // on the perimeter so the remaining work in a long queue is scannable,
  // `settled` drops the lift so a worked-down queue visibly flattens. Colour is
  // never the only carrier — every site that passes `state` also shows the word.
  
  // Defaults to `article` because a card is nearly always a self-contained item
  // in a list.
  export type CardProps = SurfaceAttributes & {
    as?: string;
    tone?: SurfaceTone;
    state?: SurfaceState;
    density?: SurfaceDensity;
  };
</script>

<script lang="ts">
  let {
    as = 'article',
    class: className,
    tone = 'default',
    state = 'none',
    density = 'md',
    ref = $bindable(null),
    children,
    ...rest
  }: CardProps = $props();
</script>

<svelte:element
  this={as}
  bind:this={ref}
  data-slot="card"
  class={cn(surfaceVariants({ depth: 'card', tone, state, density }), className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>

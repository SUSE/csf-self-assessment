<script lang="ts" module>
  import { cn } from '../../utils/cn';
  import type { SurfaceAttributes } from './attributes';
  import { surfaceVariants, type SurfaceDensity, type SurfaceTone } from './variants';

  // One section of a screen: a plane lifted off the canvas.
  //
  // `as` exists because a panel is a landmark in some places and a plain box in
  // others — `section` is right when it carries an `aria-label`, `div` when it
  // is one of several boxes an outer section already names. The default is
  // `section` because that is what the overwhelming majority of the migrated
  // sites were.
  export type PanelProps = SurfaceAttributes & {
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
  }: PanelProps = $props();
</script>

<!-- `class` merges LAST so a site keeps its own layout: `@container/checks`,
     `space-y-4`, `min-w-0 grow basis-[26rem]`, `max-h-[60vh] overflow-y-auto`.
     Container styling comes from the variant; everything about where the panel
     sits and how its children flow stays with the caller. -->
<svelte:element
  this={as}
  bind:this={ref}
  data-slot="panel"
  class={cn(surfaceVariants({ depth: 'panel', tone, density }), className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>

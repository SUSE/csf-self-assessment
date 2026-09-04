<script lang="ts">
  import type { Snippet } from 'svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { cn } from '../../utils/cn';
  import { SLIDE_MS } from '../motion';
  import SidebarBody from './sidebar-body.svelte';
  import SidebarRail from './sidebar-rail.svelte';

  // A collapsible side panel whose collapse control lives *in the panel*, not
  // in the app header. Open: a title row carries a chevron that collapses it.
  // Collapsed: the panel shrinks to a thin rail showing an expand chevron plus
  // an optional icon rail (the `rail` snippet), so it stays reachable without
  // header clutter.
  
  // MOTION: the panel's width animates, and the contents SLIDE with it — the open
  // body enters from the panel's own outer edge and leaves the same way, so opening
  // reads as the panel arriving rather than as a full-width block appearing inside a
  // gap that is still widening. Content is laid out at its final width and clipped,
  // so nothing reflows mid-slide. Reduced motion zeroes the duration (the state
  // change still happens instantly, it just doesn't travel).

  type Props = {
    side: 'left' | 'right';
    open: boolean;
    onToggle: () => void;
    title?: string | undefined;
    id?: string | undefined;
    /** Width when open.*/
    width?: string;
    /** Width of the collapsed rail.*/
    railWidth?: string;
    children: Snippet;
    /** Collapsed-rail content. receives an `expand` callback for its icons.*/
    rail?: Snippet<[expand: () => void]> | undefined;
    class?: string;
  };

  let {
    side,
    open,
    onToggle,
    title,
    id,
    width = '18rem',
    railWidth = '3rem',
    children,
    rail,
    class: className,
  }: Props = $props();

  // The chevron points the way the panel will move: toward its own edge to
  // collapse (open), toward the content to expand (collapsed).
  const Chevron = $derived(open === (side === 'left') ? ChevronLeft : ChevronRight);
  const label = $derived(
    `${open ? 'Collapse' : 'Expand'} ${title ?? (side === 'left' ? 'left panel' : 'right panel')}`,
  );

  // One duration for the width and the contents, so they travel as one panel. it is
  // the app's shared slide (ui/motion), the same beat as a stage change.
  const slideMs = $derived(prefersReducedMotion.current ? 0 : SLIDE_MS);
  // Contents travel from the panel's OUTER edge — off-screen-ward — so the motion
  // agrees with the chevron and with the width that is opening for them.
  const slide = $derived({ x: side === 'left' ? -24 : 24, duration: slideMs });
</script>

<!-- A one-cell GRID, not a column: the state leaving and the state arriving occupy
     the same cell for the length of the slide, so neither pushes the other around
     while they cross. -->
<aside
  {id}
  aria-label={title}
  class={cn(
    'grid shrink-0 grid-cols-1 grid-rows-1 overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] ease-in-out motion-reduce:transition-none',
    side === 'left' ? 'border-r border-sidebar-border' : 'border-l border-sidebar-border',
    className,
  )}
  style:width={open ? width : railWidth}
  style:transition-duration={`${slideMs}ms`}
>
  {#if open}
    <SidebarBody {side} {title} {label} icon={Chevron} {width} {onToggle} {slide}>
      {@render children()}
    </SidebarBody>
  {:else}
    <SidebarRail {label} icon={Chevron} width={railWidth} {onToggle} {slide} {rail} />
  {/if}
</aside>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { cn } from '../../utils/cn';
  import { Button } from '../button';

  // The OPEN state of a Sidebar: a title row carrying the collapse chevron, over the
  // panel's scrolling content. Internal to app-shell.
  //
  // It is laid out at its full open width and clipped by the panel, so the content
  // never reflows while the panel is animating. The collapse control sits on the
  // panel's INNER edge (toward the content it uncovers) — one Button, positioned by
  // reversing the row for a left panel rather than by a second copy of the markup.
  type Props = {
    side: 'left' | 'right';
    title?: string | undefined;
    /** Accessible name for the collapse control, worded by the panel. */
    label: string;
    icon: LucideIcon;
    /** The panel's open width — this is laid out at it, not at the animating width. */
    width: string;
    onToggle: () => void;
    /** The panel's slide, so the contents travel with the width. */
    slide: { x: number; duration: number };
    children: Snippet;
  };
  let { side, title, label, icon: Icon, width, onToggle, slide, children }: Props = $props();
</script>

<!-- col/row-start-1: the leaving and entering states share ONE grid cell, so they
     cross without either pushing the other down mid-slide (the ui/motion carousel
     pattern, one panel wide). -->
<div
  class="col-start-1 row-start-1 flex min-h-0 flex-col"
  style:width
  transition:fly={{ x: slide.x, duration: slide.duration, opacity: 0 }}
>
  <!-- `min-h-12`, the same row height the stage toolbar uses, so the two bottom
       borders land on one line across the shell. -->
  <div
    class={cn(
      'flex min-h-12 shrink-0 items-center gap-1 border-b border-sidebar-border px-2',
      side === 'left' && 'flex-row-reverse',
    )}
  >
    <Button variant="ghost" size="icon" aria-label={label} title={label} onclick={onToggle}>
      <Icon class="size-4" />
    </Button>
    <span class="flex-1 truncate px-1 text-sm font-semibold text-sidebar-foreground">
      {title}
    </span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto p-3">
    {@render children()}
  </div>
</div>

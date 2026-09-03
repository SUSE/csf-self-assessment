<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { Button } from '../button';

  // The COLLAPSED state of a Sidebar: the expand chevron, plus whatever icons the
  // app keeps reachable while the panel is shut (`rail`). Internal to app-shell.
  // Shares the open state's grid cell so the two cross-slide (see sidebar-body).
  type Props = {
    /** Accessible name for the expand control, worded by the panel. */
    label: string;
    icon: LucideIcon;
    width: string;
    onToggle: () => void;
    slide: { x: number; duration: number };
    /** Collapsed-rail content; receives `expand` so an icon can open the panel. */
    rail?: Snippet<[expand: () => void]> | undefined;
  };
  let { label, icon: Icon, width, onToggle, slide, rail }: Props = $props();
</script>

<div
  class="col-start-1 row-start-1 flex flex-col items-center gap-1 py-2"
  style:width
  transition:fly={{ x: slide.x, duration: slide.duration, opacity: 0 }}
>
  <Button variant="ghost" size="icon" aria-label={label} title={label} onclick={onToggle}>
    <Icon class="size-5" />
  </Button>
  {@render rail?.(onToggle)}
</div>

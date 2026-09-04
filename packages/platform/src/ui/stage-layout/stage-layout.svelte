<script lang="ts">
  import type { Snippet } from 'svelte';
  import { carousel, SLIDE_MS } from '../motion';
  import { cn } from '../../utils/cn';

  // The stage layout: the shell that divides the app-shell content
  // area into a single-focus stage — a sticky, full-bleed header bar over a
  // carousel content region that slides when the stage changes. Each app mounts
  // exactly one: the Author workbench (StageHeader + the focused editor) and the
  // Assessment answering flow (AssessmentToolbar + the active section). Built once
  // here, wired twice — the header and the swap logic differ per app, the shell
  // does not.
  
  // CONTRACT: place as the FIRST child of a `p-6` padded column. The header's
  // `-mx-6 px-6` breaks it full-bleed against the side padding, and `-mt-6`
  // swallows the top padding so it pins flush to the top of the scrollable main
  // region (via `sticky top-0`) instead of floating a dead `pt-6` gap below the
  // app-shell header — the toolbar's own vertical padding is the header bar's
  // breathing room. The `-mt-6` only takes effect as the first child, so a
  // sibling above it (e.g. an error alert) still spaces normally via `space-y`
  // and the header sits below it rather than overlapping. Header and content
  // render as sibling roots (no wrapper div), so the geometry above is measured
  // against the parent column and the column's own `space-y-*` still spaces the
  // parts.
  type Props = {
    // Identifies the current stage. When it changes the content carousels. an
    // unchanged value never re-slides, so an in-place edit doesn't flash.
    stageKey: unknown;
    // Slide direction for the NEXT swap: 1 = forward (enter from the right),
    // 1 = back (enter from the left). Set it in the caller's `$effect.pre` —
    // before the DOM updates — so the keyed swap reads the right direction
    // (see motion.ts).
    dir?: number;
    // Base slide duration. collapsed to an instant swap under reduced motion.
    duration?: number;
    // Extra classes on the content grid — the gap under the sticky header
    // (`pt-*`) is the usual knob. defaults to `pt-6`.
    contentClass?: string;
    // The sticky header bar's content: the stage's sole navigation.
    header: Snippet;
    // An optional strip between the header and the content (e.g. an error alert).
    banner?: Snippet;
    // The stage content — one focus/section at a time. it rides the carousel.
    children: Snippet;
  };
  let {
    stageKey,
    dir = 1,
    duration = SLIDE_MS,
    contentClass,
    header,
    banner,
    children,
  }: Props = $props();

  // Reduced motion collapses the slide to an instant swap. Owned here so neither
  // app repeats the media-query wiring for its stage carousel.
  let reduceMotion = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const sync = (): void => {
      reduceMotion = mq.matches;
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });
  const ms = $derived(reduceMotion ? 0 : duration);
</script>

<!-- Sticky stage header, broken full-bleed out of the content column's padding
     (`-mx-6` sides, `-mt-6` top). it pins flush to the top of the scrollable
     main region rather than floating below the column's `pt-6`. -->
<div
  class="sticky top-0 z-20 -mx-6 -mt-6 flex min-h-12 items-center border-b border-border bg-background px-6"
>
  {@render header()}
</div>

{@render banner?.()}

<!-- The carousel: the leaving and entering stages stack in one grid cell and
     cross like a slideshow (ui/motion). -->
<div class={cn('grid overflow-x-clip pt-6', contentClass)}>
  {#key stageKey}
    <!-- `min-w-0`: a grid item's automatic minimum is its MAX-CONTENT width, so
     one nowrap cell in one row of one stage widens the track past the
     column and pushes everything to its right out under the side panel —
     which is what forced fixed pixel widths onto list rows that should just
     truncate. Removing the automatic minimum lets `truncate` do its job. -->
    <div
      class="col-start-1 row-start-1 min-w-0 space-y-6"
      in:carousel={{ dir, duration: ms }}
      out:carousel={{ dir: -dir, duration: ms }}
    >
      {@render children()}
    </div>
  {/key}
</div>

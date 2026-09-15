<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';

  // The answering BODY split into two columns — built once, wired by all three
  // answering cards (dimension / party / ladder) so the flow never drifts apart.
  // LEFT ("place it"): the graded scale — the tray + the ladder (rungs), the
  // primary placement surface, kept flush so the ladder never scrolls out of reach.
  // RIGHT ("both are real answers" + "back it"): the off-ladder escape hatches
  // (`ui/off-ladder` — Nobody knows / Doesn't apply) at the TOP, then everything that
  // QUALIFIES a placement — the evidence strip and the n/a reason field. Moving the
  // off-ladder rows here uses the horizontal real estate instead of stacking them
  // above/below the ladder and forcing a vertical scroll.
  
  // The QuestionHeader sits full-width ABOVE this, never inside it. Below `lg` the
  // grid collapses to one column. The right column is a `@container` so its content
  // adapts to the RAIL width — never to the viewport. STATELESS. pure layout.
  type Props = {
    scale: Snippet;      // left — the graded scale: tray + ladder (rungs)
    qualify: Snippet;    // right — off-ladder rows + CommitStrip? + the n/a reason field
    class?: string;
  };
  let { scale, qualify, class: className }: Props = $props();
</script>

<div class={cn('grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]', className)}>
  <div class="min-w-0 space-y-6">{@render scale()}</div>
  <div class="@container min-w-0 space-y-4">{@render qualify()}</div>
</div>

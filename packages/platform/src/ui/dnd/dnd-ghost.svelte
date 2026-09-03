<script lang="ts">
  import { getDnd } from './dnd.svelte';

  // The floating chip that follows the pointer while a drag is in flight (:
  // the critical ⚑ TRAVELS with the chip). A fixed, pointer-events-none clone of the
  // chip's look, offset off the cursor so a finger doesn't cover it, tilted + lifted
  // slightly (rotate/scale) so it reads as "picked up" (the chip-dnd prototype). On
  // release it settles out with a soft fade rather than popping, skipped under
  // prefers-reduced-motion. Mounted once per card. reads the card's dnd session.
  // Neutral border ( — never green).
  const dnd = getDnd();
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function settle(_node: Element): { duration: number; css: (t: number) => string } {
    return { duration: reduceMotion ? 0 : 150, css: (t: number) => `opacity: ${t}` };
  }
</script>

{#if dnd?.active && dnd.pos}
  <div
    out:settle
    class="pointer-events-none fixed z-50 inline-flex items-center gap-1.5 rounded-full border border-foreground bg-card px-3 py-1 text-xs font-medium shadow-lg"
    style="left: {dnd.pos.x}px; top: {dnd.pos.y}px; transform: translate(12px, 12px) rotate(-1.5deg) scale(1.03);"
    aria-hidden="true"
  >
    {#if dnd.active.payload.critical}<span class="text-warning-ink">⚑</span>{/if}<span>{dnd.active.payload.label}</span>
  </div>
{/if}

<script lang="ts" generics="P extends DragPayload">
  import type { Snippet } from 'svelte';
  import type { Rung } from '../../schema';
  import { sealSwatchClass, sealInkClass } from '../../utils/seal-color';
  import { cn } from '../../utils/cn';
  import { getDnd, dropTarget, type DragPayload } from '../dnd';

  // One rung of the ladder: the radio, the chips resting on it, and its segments of
  // the staircase rail. The ladder keeps the roving focus and the element registry.
  type Props = {
    rung: Rung;
    levelName: string;
    /** 1-based authored position — the number the keyboard hint advertises (ADR-0023). */
    position: number;
    selected: boolean;
    /** Holds the roving tabindex — exactly one rung in the group has it. */
    focusable: boolean;
    /** Rail segments: the first rung draws no upper one, the last no lower one. */
    first: boolean;
    last: boolean;
    onChoose: () => void;
    /** No fallback: the ladder binds into a record that starts empty, so the
     *  first read is `undefined` and a fallback would make Svelte reject it. */
    ref?: HTMLButtonElement | null | undefined;
    rungContent?: Snippet<[string]> | undefined;
    onDropRung?: ((rungId: string, payload: P) => void) | undefined;
  };
  let {
    rung,
    levelName,
    position,
    selected,
    focusable,
    first,
    last,
    onChoose,
    ref = $bindable(),
    rungContent,
    onDropRung,
  }: Props = $props();

  const dnd = getDnd<P>(); // undefined on the single-unit card → drop targets no-op
  const key = $derived(`rung:${rung.id}`);

  // Drop hot-spot styling (spec §4.8 / the chip-dnd prototype): while a drag is live
  // EVERY bin shows a dashed outline — the legal landing zones — and the bin under the
  // pointer goes solid + filled. Neutral only (invariant #3 — never green). Returns just
  // the border-style/colour (+ bg) so it never fights the container's baseline `border`.
  const overClass = $derived(
    !dnd?.dragging
      ? 'border-transparent'
      : dnd.over === key
        ? 'border-solid border-foreground bg-accent'
        : 'border-dashed border-border',
  );
</script>

<div
  class="relative rounded-lg border transition-colors {overClass}"
  use:dropTarget={{ session: dnd, key, onDrop: (payload) => onDropRung?.(rung.id, payload) }}
>
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    tabindex={focusable ? 0 : -1}
    bind:this={ref}
    onclick={onChoose}
    class="group relative flex w-full items-start gap-4 rounded-lg px-2 py-3 text-left transition-colors {selected
      ? 'bg-accent ring-1 ring-inset ring-border'
      : 'hover:bg-accent/50'}"
  >
    <span aria-hidden="true" class="relative z-10 shrink-0 rounded-md bg-card">
      <!-- Badge: swatch tint for the fill, ramp ink (sealInkClass) for the number —
           matching the SVG wheels. twMerge drops the swatch's baked-in text-foreground. -->
      <span class={cn('grid size-8 place-items-center rounded-md text-sm font-semibold', sealSwatchClass(rung.seal), sealInkClass(rung.seal))}
      >{rung.seal}</span>
    </span>

    <span class="min-w-0 flex-1 space-y-1 pt-0.5">
      <!-- Level name only: the `SEAL-n` token is an authoring handle, and printing it
           here invites the room to chase a number instead of reading the rung. -->
      <span class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {levelName}
      </span>
      <span class="block text-reading leading-relaxed text-foreground">{rung.description}</span>
    </span>

    <span class="shrink-0 self-start pt-1">
      {#if selected}
        <span class="text-foreground" aria-hidden="true">✓</span>
      {:else}
        <kbd
          class="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true">{position}</kbd
        >
      {/if}
    </span>
  </button>

  {#if rungContent}
    <div class="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pb-2 pl-12 empty:hidden">
      {@render rungContent(rung.id)}
      <!-- The dashed pill that previews WHAT will land here (spec §4.8 / the chip-dnd
           prototype: "Storage lands here"). Single-chip only (ADR-0009 — no group); the
           critical ⚑ travels with it. Neutral (invariant #3 — never green). -->
      {#if dnd?.over === key && dnd.active}
        <span
          class="inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground px-3 py-1 text-xs font-medium text-foreground"
          aria-hidden="true"
        >
          {#if dnd.active.payload.critical}<span class="text-warning-ink">⚑</span>{/if}<span>{dnd.active.payload.label}</span><span class="text-muted-foreground">lands here</span>
        </span>
      {/if}
    </div>
  {/if}

  <!-- Staircase rail: one continuous line threaded through the badge column, drawn at
       the rung level (NOT inside the button) so it spans the WHOLE row — resting chips
       and all — instead of snapping wherever the button ends. It paints above the row
       background (it follows the button in the DOM) but under the z-10 opaque badge
       chip, so the line reads as connecting badge-to-badge. Each segment overruns 2px
       past its row edge so neighbouring segments overlap — no transparent-border or
       selection-fill gap can split the rail. pointer-events-none so it never eats a click. -->
  {#if !first}
    <span aria-hidden="true" class="pointer-events-none absolute left-6 -top-0.5 h-[30px] w-px -translate-x-1/2 bg-border"></span>
  {/if}
  {#if !last}
    <span aria-hidden="true" class="pointer-events-none absolute left-6 top-7 -bottom-0.5 w-px -translate-x-1/2 bg-border"></span>
  {/if}
</div>

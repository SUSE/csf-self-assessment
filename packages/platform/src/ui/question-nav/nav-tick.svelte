<script lang="ts">
  import type { NavTone } from './types';
  import { navTick, navFillClass } from './variants';

  // One status tick. Interactive (a map cell) when `onclick` is given, otherwise
  // a decorative glyph (the crumb mini). The fill span's HEIGHT is the second,
  // redundant channel alongside hue — floored so any progress shows at 34px.
  type Props = {
    tone: NavTone;
    /** 0..1 placement fraction. only `partial`/`done` render a fill.*/
    fraction?: number;
    /** Draw the amber don't-know notch (top-right).*/
    notch?: boolean;
    /** Draw the muted doesn't-apply (n/a) notch (top-left).*/
    naMark?: boolean;
    useGreen?: boolean;
    active?: boolean;
    /** The glyph inside — the question's position within its objective.*/
    label: string;
    size?: 'tick' | 'mini';
    /** Native tooltip (question text).*/
    title?: string;
    ariaLabel?: string;
    /** Presence makes the tick a button. absence a decorative span.*/
    onclick?: () => void;
  };
  let {
    tone,
    fraction = 0,
    notch = false,
    naMark = false,
    useGreen = false,
    active = false,
    label,
    size = 'tick',
    title,
    ariaLabel,
    onclick,
  }: Props = $props();

  const interactive = $derived(onclick !== undefined);
  const pct = $derived(
    tone === 'done'
      ? 100
      : tone === 'partial'
        ? Math.min(100, Math.max(30, Math.round(fraction * 100)))
        : 0,
  );
  const cls = $derived(navTick({ tone, useGreen, active, size, interactive }));
  const fillCls = $derived(navFillClass(tone, useGreen));
  // On the crumb mini the digit IS the content, so it keeps the tick's own weight.
  // On a map cell the status is the content and the digit is only a locator: same
  // ink, dialled right back so it reads as a faint index behind the fill.
  const labelCls = $derived(size === 'mini' ? '' : 'font-medium opacity-45');
</script>

{#snippet body()}
  {#if pct > 0}
    <span class="absolute inset-x-0 bottom-0 {fillCls}" style="height:{pct}%"></span>
  {/if}
  {#if notch}
    <!-- The bg halo separates the amber dot from an amber `partial` fill, so the
     don't-know reads on an in-progress tick as well as a green answered one. -->
    <span class="absolute right-0.5 top-0.5 z-20 size-[5px] rounded-full bg-warning ring-1 ring-background"></span>
  {/if}
  {#if naMark}
    <!-- Doesn't-apply: muted (an exclusion, not a warning — never amber/green),
     mirrored to the top-LEFT so it reads distinctly beside the notch. -->
    <span class="absolute left-0.5 top-0.5 z-20 size-[5px] rounded-full bg-muted-foreground ring-1 ring-background"></span>
  {/if}
  <!-- Number rides ABOVE the notch/n-a dots (z-30 > their z-20): on the 18px crumb
     mini the corner dots pinch into the digit, and the digit must stay legible. -->
  <span class="relative z-30 {labelCls}">{label}</span>
{/snippet}

{#if interactive}
  <button
    type="button"
    class={cls}
    {title}
    aria-label={ariaLabel}
    aria-current={active ? 'true' : undefined}
    onclick={() => onclick?.()}
  >
    {@render body()}
  </button>
{:else}
  <span class={cls} aria-hidden="true">{@render body()}</span>
{/if}

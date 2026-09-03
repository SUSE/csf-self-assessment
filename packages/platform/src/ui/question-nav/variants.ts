import { tv, type VariantProps } from 'tailwind-variants';
import type { NavTone } from './types';

// The coverage/status tick shared by the crumb (mini, decorative) and the map
// (interactive). Redundant channels on purpose: hue (tone) AND fill height (set
// inline by the component from the fraction) — colour alone fails WCAG 1.4.1.
//
// Green is NOT baked in. `useGreen` gates ONLY the `done` hue, so the author app
// (green-reserved: green = SEAL-3/4, and the author shows none) renders the exact
// same tick green-free. Focus/active is a NEUTRAL foreground outline in both
// modes — never `ring-primary`/`ring-ring` (both green), which would collide with
// a green `done`.
export const navTick = tv({
  base: 'relative grid shrink-0 place-items-center overflow-hidden rounded-md border font-mono font-bold transition-colors',
  variants: {
    tone: {
      // `--border` in dark mode sits almost on top of `--popover`, so an empty
      // outline vanishes there; derive it from `muted-foreground` (quiet but
      // present in BOTH themes) so the not-started box always reads.
      none: 'border-muted-foreground/30 text-muted-foreground',
      partial: 'border-warning/60 text-foreground',
      done: 'text-foreground', // border set by the useGreen compound below
      na: 'border-dashed border-border/60 text-muted-foreground/50 opacity-50',
      flag: 'border-destructive text-destructive-ink',
    },
    useGreen: { true: '', false: '' },
    // Interactive map ticks light up on hover/focus; the decorative samples do not.
    interactive: {
      true:
        'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:!outline-foreground',
      false: 'pointer-events-none',
    },
    active: {
      true: 'outline outline-2 outline-offset-1 outline-foreground',
      false: '',
    },
    size: {
      // The map's interactive status cell — 24px, the SC 2.5.8 Target Size (Minimum)
      // floor. 10px keeps a two-digit index inside the box (the base clips overflow).
      tick: 'size-6 text-3xs leading-none',
      mini: 'size-[22px] rounded-[6px] text-2xs',
    },
  },
  compoundVariants: [
    { tone: 'done', useGreen: true, class: 'border-primary/60' },
    { tone: 'done', useGreen: false, class: 'border-foreground/70' },
    // Hover affordances only where the tick is clickable. Status hue stays inside
    // the tick; active/focus remain neutral foreground outlines.
    { tone: 'none', interactive: true, class: 'hover:border-foreground/50 hover:text-foreground' },
    { tone: 'partial', interactive: true, class: 'hover:border-warning hover:bg-warning/10' },
    { tone: 'done', useGreen: true, interactive: true, class: 'hover:border-primary hover:bg-primary/10' },
    {
      tone: 'done',
      useGreen: false,
      interactive: true,
      class: 'hover:border-foreground hover:bg-foreground/5',
    },
    {
      tone: 'na',
      interactive: true,
      class: 'hover:border-muted-foreground/60 hover:text-muted-foreground hover:opacity-80',
    },
    { tone: 'flag', interactive: true, class: 'hover:bg-destructive/10' },
  ],
  defaultVariants: {
    tone: 'none',
    useGreen: false,
    interactive: true,
    active: false,
    size: 'tick',
  },
});

export type NavTickVariant = VariantProps<typeof navTick>;

// The fill layer's background — the second, redundant channel. `none`/`na`/`flag`
// carry no fill (empty box / dashed / red border only). Green is confined here to
// `done` under `useGreen`, exactly as in the tick border.
export function navFillClass(tone: NavTone, useGreen: boolean): string {
  switch (tone) {
    case 'partial':
      return 'bg-warning/40';
    case 'done':
      return useGreen ? 'bg-primary/30' : 'bg-foreground/25';
    default:
      return '';
  }
}

// Words for the tick's tooltip / accessible label. "answered / in progress / not
// started" — never "complete / healthy / good": a green tick reports done-ness,
// not a good score (same discipline as keeping the floor off a working partial).
export const NAV_TONE_LABEL: Record<NavTone, string> = {
  done: 'answered',
  partial: 'in progress',
  none: 'not started',
  na: 'not in scope',
  flag: 'has issues',
};

<script lang="ts">
  import type { Snippet } from 'svelte';
  // One entry in the wheel's mark legend — the `span` + fixed-size themed `svg`
  // swatch that wrapped every mark identically, in one place. The mark geometry is
  // `children` (drawn in the swatch's viewBox), themed by `ink` through
  // currentColor. `label` is its caption. Internal to instrument-wheel.
  type Props = {
    /** Swatch viewBox — '0 0 24 12' for a line mark, '0 0 12 12' for a glyph.*/
    viewBox: string;
    /** Swatch pixel size. defaults to a 12×12 glyph.*/
    w?: number;
    h?: number;
    /** Theme ink utility for the swatch (`text-foreground`, `text-primary`, …).*/
    ink?: string;
    children: Snippet;
    label: string;
  };
  let { viewBox, w = 12, h = 12, ink = 'text-foreground', children, label }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5">
  <svg width={w} height={h} {viewBox} aria-hidden="true" class="shrink-0 {ink}">
    {@render children()}
  </svg>
  {label}
</span>

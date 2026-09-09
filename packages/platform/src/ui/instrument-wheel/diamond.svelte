<script lang="ts">
  // The wheel's diamond glyph, in one place. It renders three marks that were the
  // same hand-written SVG path four times over: the hollow foreground STRATA marks
  // along a spoke, the filled seal-ramp RESULT mark just inside the rim, and both
  // legend swatches. `class` carries the theme ink (`text-foreground`, a
  // `sealInkClass(...)`, …) so the glyph stays coloured by `currentColor`. `filled`
  // flips fill/stroke so a result reads as solid and a structural layer as an
  // outline. Internal to instrument-wheel — not exported from the barrel.
  type Props = {
    cx: number;
    cy: number;
    r?: number;
    /** Solid (a result) vs. hollow outline (a structural layer).*/
    filled?: boolean;
    class?: string;
  };
  let { cx, cy, r = 4, filled = false, class: className = '' }: Props = $props();
</script>

<path
  d={`M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`}
  fill={filled ? 'currentColor' : 'var(--background)'}
  stroke={filled ? 'var(--background)' : 'currentColor'}
  stroke-width={filled ? 1.5 : 1}
  class={className}
/>

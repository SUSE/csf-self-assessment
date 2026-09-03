<script lang="ts">
  import { polar, CX, CY, HUB } from './geometry';

  // A fat transparent lane from the hub out past the label, so the whole slice is
  // clickable rather than just the thin painted spoke. `pointer-events="all"`
  // catches it despite the transparent stroke.
  type Props = { deg: number; reach: number };
  let { deg, reach }: Props = $props();

  const from = $derived(polar(CX, CY, HUB, deg));
  const to = $derived(polar(CX, CY, reach, deg));
</script>

<line
  x1={from[0]}
  y1={from[1]}
  x2={to[0]}
  y2={to[1]}
  stroke="transparent"
  stroke-width="30"
  stroke-linecap="round"
  pointer-events="all"
/>

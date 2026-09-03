<script lang="ts">
  import { polar, CX, CY, HUB } from '../wheel';

  // A coverage gap: a dimension no question reaches yet, drawn as a short dashed
  // stub at the hub. The spoke's faint track carries the same alarm hue behind it
  // (see wheel-spoke), because the stub alone is 12px and at a glance read as a
  // short spoke rather than as a finding. Internal to instrument-wheel.
  type Props = { deg: number };
  let { deg }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const stubPt = $derived(polar(CX, CY, HUB + 12, deg));
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={stubPt[0]}
  y2={stubPt[1]}
  stroke="currentColor"
  stroke-width="9"
  stroke-linecap="round"
  stroke-dasharray="1 4"
  class="text-destructive"
/>

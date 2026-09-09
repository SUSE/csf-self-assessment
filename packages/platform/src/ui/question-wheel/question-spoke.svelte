<script lang="ts">
  import {
    labelAnchor,
    labelNudge,
    polar,
    truncate,
    CX,
    CY,
    HUB,
    type SealRings,
  } from '../wheel';
  import UnitMark from './unit-mark.svelte';
  import ServedRing from './served-ring.svelte';
  import type { WheelUnit } from './model';

  // One whole spoke: the line out to the rim, the mark on it, the served-party
  // markers beyond it, and the label naming it.
  type Props = {
    unit: WheelUnit;
    deg: number;
    active: boolean;
    binding: boolean;
    rings: SealRings;
    rim: number;
    labelR: number;
    exposed: boolean;
  };
  let { unit, deg, active, binding, rings, rim, labelR, exposed }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const rimPt = $derived(polar(CX, CY, rim, deg));
  const labelPt = $derived(polar(CX, CY, labelR, deg));
  const nudge = $derived(labelNudge(deg));
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={rimPt[0]}
  y2={rimPt[1]}
  stroke="currentColor"
  stroke-width={active ? 2.2 : unit.gates ? 1 : 0.6}
  stroke-dasharray={unit.state === 'unanswered' ? '4 5' : undefined}
  class={unit.state === 'na' ? 'text-border' : 'text-muted-foreground'}
/>

<UnitMark {unit} {deg} {rings} {rim} {binding} />

{#if exposed}
  <ServedRing {unit} {deg} {rim} />
{/if}

<text
  x={labelPt[0] + nudge.dx}
  y={labelPt[1] + nudge.dy}
  text-anchor={labelAnchor(deg)}
  font-size="13"
  font-weight={active ? 500 : 400}
  fill="currentColor"
  class={unit.state === 'na' ? 'text-muted-foreground' : 'text-foreground'}
>
  {truncate(unit.label)}{unit.state === 'na' ? ' · n/a' : ''}
</text>
{#if unit.sub || !unit.gates}
  <text
    x={labelPt[0] + nudge.dx}
    y={labelPt[1] + nudge.dy + 14}
    text-anchor={labelAnchor(deg)}
    font-size="12"
    fill="currentColor"
    class="text-muted-foreground"
  >
    {unit.sub || 'scores, no gate'}
  </text>
{/if}

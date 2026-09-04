<script lang="ts">
  import { polar, CX, CY, HUB } from '../wheel';
  import { barEnd, inkClass } from './draw';
  import type { InstrumentChip } from './model';

  // A magnitude spoke: the bar's LENGTH is the question-unit count (the busiest
  // chip reaches the rim). The merge wheel's coverage spoke is the same thick bar
  // but round-capped and filled hub→rim as a FRACTION. to keep this from reading
  // as "covered / filled", the count bar has a flat end capped with a
  // perpendicular gauge tick — a measured reading, so a long spoke says "many
  // questions land here", not "this is done". Internal to instrument-wheel.
  type Props = {
    chip: InstrumentChip;
    deg: number;
    /** The busiest chip's count — what a full-rim spoke represents.*/
    maxCount: number;
  };
  let { chip, deg, maxCount }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const endPt = $derived(polar(CX, CY, barEnd(chip, maxCount), deg));
  // Half-length of the gauge tick, projected along the spoke so it stays
  // perpendicular to the bar at every angle.
  const tick = $derived({
    x: Math.cos((deg * Math.PI) / 180) * 5,
    y: Math.sin((deg * Math.PI) / 180) * 5,
  });
  const ink = $derived(inkClass(chip));
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={endPt[0]}
  y2={endPt[1]}
  stroke="currentColor"
  stroke-width="9"
  stroke-linecap="butt"
  class={ink}
/>
<line
  x1={endPt[0] - tick.x}
  y1={endPt[1] - tick.y}
  x2={endPt[0] + tick.x}
  y2={endPt[1] + tick.y}
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  class={ink}
/>

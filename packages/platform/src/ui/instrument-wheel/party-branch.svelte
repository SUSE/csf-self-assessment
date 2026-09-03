<script lang="ts">
  import { polar, CX, CY, HUB, RIM } from '../wheel';
  import { inkClass } from './draw';
  import type { InstrumentChip } from './model';

  // A party TYPE is a taxonomy branch, not a magnitude. Every type carries the
  // same party-axis load (its count is on the label), so a length-scaled bar
  // would fake a difference that cannot exist. Draw a thin stem to a NODE at the
  // rim — a fixed station that reads as "a category", never "filled to here". The
  // assessed party (the "us") gets a solid node, third parties a hollow one (the
  // emphasis convention the merge wheel's markers already use). Internal to
  // instrument-wheel.
  type Props = {
    chip: InstrumentChip;
    deg: number;
  };
  let { chip, deg }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const rimPt = $derived(polar(CX, CY, RIM, deg));
  const ink = $derived(inkClass(chip));
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={rimPt[0]}
  y2={rimPt[1]}
  stroke="currentColor"
  stroke-width="2.5"
  class={ink}
/>
<circle
  cx={rimPt[0]}
  cy={rimPt[1]}
  r="5"
  fill={chip.emphasis ? 'currentColor' : 'var(--background)'}
  stroke="currentColor"
  stroke-width="2"
  class={ink}
/>

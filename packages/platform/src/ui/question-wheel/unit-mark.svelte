<script lang="ts">
  import { markerRadius, polar, ringRadius, CX, CY, type SealRings } from '../wheel';
  import { sealInkClass } from '../../utils/seal-color';
  import type { WheelUnit } from './model';

  // What sits ON one spoke: the placed dot (with its evidence diamond), the hollow
  // don't-know ring beyond the rim, or the open circle of a unit with no record.
  type Props = {
    unit: WheelUnit;
    deg: number;
    rings: SealRings;
    rim: number;
    binding: boolean;
  };
  let { unit, deg, rings, rim, binding }: Props = $props();
</script>

{#if unit.state === 'answered' && unit.seal !== null}
  {@const dot = polar(CX, CY, ringRadius(rings, unit.seal), deg)}
  <circle cx={dot[0]} cy={dot[1]} r={binding ? 8 : 6.5} fill="currentColor" class={sealInkClass(unit.seal)} />
  <circle
    cx={dot[0]}
    cy={dot[1]}
    r={binding ? 8 : 6.5}
    fill="none"
    stroke="currentColor"
    stroke-width={binding ? 2 : 1.5}
    stroke-dasharray={unit.swept && !binding ? '3 2' : undefined}
    class={binding ? 'text-destructive' : unit.swept ? 'text-muted-foreground' : 'text-background'}
  />
  {#if unit.evidence}
    {@const mark = polar(CX, CY, ringRadius(rings, unit.seal) + 14, deg)}
    <rect
      x={mark[0] - 3.5}
      y={mark[1] - 3.5}
      width="7"
      height="7"
      transform={`rotate(45 ${mark[0]} ${mark[1]})`}
      fill="currentColor"
      class="text-muted-foreground"
    />
  {/if}
{:else if unit.state === 'dont-know'}
  {@const mark = polar(CX, CY, markerRadius(rim, 0), deg)}
  <circle
    cx={mark[0]}
    cy={mark[1]}
    r="6"
    fill="none"
    stroke="currentColor"
    stroke-width="1.2"
    stroke-dasharray="2 2"
    class={unit.gates ? 'text-destructive' : 'text-muted-foreground'}
  />
{:else if unit.state === 'unanswered'}
  {@const rimPt = polar(CX, CY, rim, deg)}
  <circle cx={rimPt[0]} cy={rimPt[1]} r="5" fill="currentColor" class="text-background" />
  <circle
    cx={rimPt[0]}
    cy={rimPt[1]}
    r="5"
    fill="none"
    stroke="currentColor"
    stroke-width="1"
    stroke-dasharray="2 2"
    class="text-muted-foreground"
  />
{/if}

<script lang="ts">
  import { polar, CX, CY, HUB, type SealRings } from '../wheel';
  import { sealInkClass } from '../../utils/seal-color';
  import type { MergeChip } from './model';

  // Radius reverts to the SEAL rung: one dot per recorded seal, and an unresolved
  // conflict drawn as the literal span between the rungs two partials asserted.
  type Props = { chip: MergeChip; deg: number; rings: SealRings; active: boolean };
  let { chip, deg, rings, active }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const rimPt = $derived(polar(CX, CY, rings[4], deg));
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={rimPt[0]}
  y2={rimPt[1]}
  stroke="currentColor"
  stroke-width={active ? 2 : chip.gates ? 1 : 0.6}
  class="text-muted-foreground"
/>
{#each chip.seals as seal (seal)}
  {@const dot = polar(CX, CY, rings[seal], deg)}
  <circle cx={dot[0]} cy={dot[1]} r="5.5" fill="currentColor" class={sealInkClass(seal)} />
{/each}
{#each chip.conflicts as conflict, ci (conflict.questionId + ':' + ci)}
  {#if conflict.resolved === null && conflict.seals.length > 1}
    {@const lo = polar(CX, CY, rings[conflict.seals[0]], deg)}
    {@const hi = polar(CX, CY, rings[conflict.seals[conflict.seals.length - 1]], deg)}
    <line
      x1={lo[0]}
      y1={lo[1]}
      x2={hi[0]}
      y2={hi[1]}
      stroke="currentColor"
      stroke-width="3"
      class="text-destructive"
    />
    {#each conflict.seals as seal (seal)}
      {@const end = polar(CX, CY, rings[seal], deg)}
      <circle
        cx={end[0]}
        cy={end[1]}
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="text-destructive"
      />
    {/each}
  {:else if conflict.resolved !== null}
    {@const kept = polar(CX, CY, rings[conflict.resolved], deg)}
    <circle
      cx={kept[0]}
      cy={kept[1]}
      r="7"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      class="text-destructive"
    />
  {/if}
{/each}

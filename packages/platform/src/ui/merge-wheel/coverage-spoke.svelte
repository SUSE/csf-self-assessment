<script lang="ts">
  import { polar, CX, CY, HUB } from '../wheel';
  import { coverageRadius, type MergeChip } from './model';

  // The hub-to-rim bar: covered, then claimed-incomplete (a person's gap), then
  // unclaimed (an estate gap), over the full-length track.
  type Props = { chip: MergeChip; deg: number; rim: number; active: boolean };
  let { chip, deg, rim, active }: Props = $props();

  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const rimPt = $derived(polar(CX, CY, rim, deg));
  const coveredPt = $derived(polar(CX, CY, coverageRadius(HUB, rim, chip.total, chip.covered), deg));
  const claimedPt = $derived(
    polar(CX, CY, coverageRadius(HUB, rim, chip.total, chip.covered + chip.claimedIncomplete), deg),
  );
  const width = $derived(active ? 11 : 9);
</script>

<line
  x1={hubPt[0]}
  y1={hubPt[1]}
  x2={rimPt[0]}
  y2={rimPt[1]}
  stroke="currentColor"
  stroke-width={width}
  stroke-linecap="round"
  class="text-border"
/>
{#if chip.unclaimed > 0}
  <line
    x1={claimedPt[0]}
    y1={claimedPt[1]}
    x2={rimPt[0]}
    y2={rimPt[1]}
    stroke="currentColor"
    stroke-width={width}
    stroke-dasharray="1 4"
    class="text-destructive"
  />
{/if}
{#if chip.claimedIncomplete > 0}
  <line
    x1={coveredPt[0]}
    y1={coveredPt[1]}
    x2={claimedPt[0]}
    y2={claimedPt[1]}
    stroke="currentColor"
    stroke-width={width}
    class="text-muted-foreground"
  />
{/if}
{#if chip.covered > 0}
  <line
    x1={hubPt[0]}
    y1={hubPt[1]}
    x2={coveredPt[0]}
    y2={coveredPt[1]}
    stroke="currentColor"
    stroke-width={width}
    stroke-linecap="round"
    class="text-primary"
  />
{/if}

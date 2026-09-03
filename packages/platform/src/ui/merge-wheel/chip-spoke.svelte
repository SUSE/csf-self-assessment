<script lang="ts">
  import { inlineNameBudget, truncate, type PlacedLabel, type SealRings } from '../wheel';
  import CoverageSpoke from './coverage-spoke.svelte';
  import SealSpoke from './seal-spoke.svelte';
  import EdgeRing from './edge-ring.svelte';
  import type { MergeChip } from './model';

  // One whole chip spoke: the mode's bar or rung dots, the serves markers beyond
  // the rim, and the label naming it.
  type Props = {
    chip: MergeChip;
    deg: number;
    active: boolean;
    label: PlacedLabel;
    mode: 'coverage' | 'merge';
    rings: SealRings;
    rim: number;
    labelR: number;
    exposed: boolean;
  };
  let { chip, deg, active, label, mode, rings, rim, labelR, exposed }: Props = $props();

  const sub = $derived(mode === 'coverage' ? `${chip.covered} of ${chip.total}` : chip.sub);
</script>

{#if mode === 'coverage'}
  <CoverageSpoke {chip} {deg} {rim} {active} />
{:else}
  <SealSpoke {chip} {deg} {rings} {active} />
{/if}

{#if exposed}
  <EdgeRing {chip} {deg} {rim} />
{/if}

<!-- Name and count on ONE line: the count is what the name is being read FOR,
     and stacking it underneath doubled every label's height, which is what
     forced the de-collision to shove labels off their own spokes. The name's
     character budget is computed against the count that has to share the run,
     so a wider count tightens the name instead of running off the viewBox. -->
<text
  x={label.x}
  y={label.y}
  text-anchor={label.anchor}
  font-size="13"
  font-weight={active ? 500 : 400}
  fill="currentColor"
  class="text-foreground"
>
  {truncate(chip.name, inlineNameBudget(labelR, sub))}<tspan
    font-size="11"
    class="text-muted-foreground"
    fill="currentColor"
    dx="6">{sub}</tspan
  >
</text>

<script lang="ts">
  import type { RibbonModel } from '../../analytics';
  import { Panel } from '../panel';
  import RosterReading from './roster-reading.svelte';
  import UnitComposition from './unit-composition.svelte';

  // The base a dashboard reading is taken against, drawn rather than listed: the
  // count and its consequence, the base's composition across whatever width is
  // going, then the roster it was read against. The per-question answered/total is
  // banned from every view (analytics), so it never appears here.
  
  // One wrapping flex band, no breakpoint — the side panels collapse 18rem → 3rem
  // without the viewport moving. The roster is separated by proximity, not a rule:
  // a hairline before it reads as a stray vertical mark once it wraps.
  let {
    model,
  }: {
    model: RibbonModel;
  } = $props();

  const units = $derived(`${model.unitsPlaced} of ${model.unitsTotal} units`);
  const roster = $derived(`${model.parties} ${model.parties === 1 ? 'party' : 'parties'}`);
  const contributors = $derived(`${model.contributors} contributors`);
</script>

<Panel
  as="div"
  density="none"
  data-ribbon
  class="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3">
  <div class="flex shrink-0 flex-col gap-0.5">
    <!-- One text node: the acceptance scripts read this attribute exactly. -->
    <span data-ribbon-units class="text-base font-semibold tabular-nums text-card-foreground">{units}</span>
    <span class="text-xs text-muted-foreground">The floor can only fall from here.</span>
  </div>

  <UnitComposition
    total={model.unitsTotal}
    placed={model.unitsPlaced}
    dontKnow={model.dontKnow}
    floor={model.floor}
    class="min-w-0 flex-[1_1_14rem]" />

  <div class="ml-auto flex shrink-0 items-start gap-6">
    <RosterReading label={roster} count={model.parties} tone="soft" data-ribbon-parties />
    {#if model.contributors > 1}
      <RosterReading
        label={contributors}
        count={model.contributors}
        tone="ink"
        data-ribbon-contributors />
    {/if}
  </div>
</Panel>

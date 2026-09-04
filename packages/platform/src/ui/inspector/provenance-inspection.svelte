<script lang="ts">
  import { provenanceInspection, type ProvenanceFact } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import InspectionHeader from './inspection-header.svelte';
  import ObjectiveGroups from './objective-groups.svelte';
  import { byObjective, provenanceBlocks } from './question-blocks';

  // ONE Inspector view for BOTH of Credibility's ratios: the units a bar measured,
  // grouped by objective. Derived live, so a ratio with no numerator left resolves
  // to nothing rather than to a stale list.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    fact: ProvenanceFact;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, fact, onOpenQuestion }: Props = $props();

  const view = $derived(
    result && workbook ? provenanceInspection(result, workbook, parties, fact) : null,
  );
  const groups = $derived(
    view && workbook ? byObjective(workbook.objectives, provenanceBlocks(view.units)) : [],
  );

  const EMPTY: Readonly<Record<ProvenanceFact, string>> = {
    swept: 'Nothing was placed by a group gesture — every answer that stands was placed on its own unit.',
    disputed: 'Nothing was disputed on landing — no partial contradicted another.',
  };
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if view === null}
    <p class="p-1 text-xs text-muted-foreground">{EMPTY[fact]}</p>
  {:else}
    <InspectionHeader title={view.title} count={view.count} note={view.note} />

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      <ObjectiveGroups {groups} onOpen={onOpenQuestion} />
    </div>
  {/if}
</div>

<script lang="ts">
  import { openUnitsInspection, whatsLeftTile } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import InspectionHeader from './inspection-header.svelte';
  import OpenUnitsGroup from './open-units-group.svelte';

  // ONE Inspector view (twin of chip-inspection): what is still unanswered, read as
  // the questions it is unanswered on. The reading is derived from the live result
  // every render, so an owner whose units have since been answered resolves to
  // nothing rather than to an empty list.
  
  // No share bars: ranking owners against each other is the tile's reading, and at
  // 24rem of rail a count per owner is all the comparison the width carries.
  type Props = {
    /** The reading on screen — the same triple the tile is given.*/
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    /** The selected owner, or null for the whole chase.*/
    group: string | null;
    /** Open a question where this app puts it (the editor, the fill surface).*/
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, group, onOpenQuestion }: Props = $props();

  const inspection = $derived(
    result && workbook ? openUnitsInspection(whatsLeftTile(result, workbook, parties), group) : null,
  );

</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if inspection === null}
    <p class="p-1 text-xs text-muted-foreground">
      Press an owner on What's left to see the questions still open on it.
    </p>
  {:else}
    <InspectionHeader
      title={inspection.groupLabel ?? 'What’s left'}
      count={`${inspection.open} of ${inspection.total}`}
      note={inspection.groupLabel === null
        ? 'Every unit still open, by who holds it.'
        : 'Units still open on this owner.'} />

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      {#each inspection.groups as group (group.key)}
        <OpenUnitsGroup {group} heading={inspection.groups.length > 1} {onOpenQuestion} />
      {/each}
    </div>
  {/if}
</div>

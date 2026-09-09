<script lang="ts">
  import { staircaseRung, staircaseTile } from '../../analytics';
  import type { Party, Seal, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { staircaseRungBlocks } from './question-blocks';

  // ONE Inspector view: the answers pinning one tread of the staircase, read as the
  // questions they answer. Derived from the live result every render, so a rung the
  // estate has since cleared resolves to nothing.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    /** The pressed tread's rung.*/
    floor: Seal;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, floor, onOpenQuestion }: Props = $props();

  const step = $derived(
    result && workbook ? staircaseRung(staircaseTile(result, workbook, parties), floor) : null,
  );
  const blocks = $derived(step === null ? [] : staircaseRungBlocks(step));
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if step === null}
    <p class="p-1 text-xs text-muted-foreground">
      Press a tread on the staircase to see the answers pinning that rung.
    </p>
  {:else}
    <InspectionHeader
      title={step.title}
      count={`${step.count} ${step.count === 1 ? 'answer' : 'answers'}`}
      note={step.unlocks} />

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-3">
      <QuestionBlockList {blocks} onOpen={onOpenQuestion} />
    </div>
  {/if}
</div>

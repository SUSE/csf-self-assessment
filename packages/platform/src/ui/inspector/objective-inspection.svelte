<script lang="ts">
  import type { Objective, RoleDef } from '../../schema';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { objectiveQuestionBlocks } from './question-blocks';

  type Props = {
    objective: Objective | null;
    roles: RoleDef[];
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { objective, roles, onOpenQuestion }: Props = $props();

  const blocks = $derived(objective ? objectiveQuestionBlocks(objective, roles) : []);
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if objective === null}
    <p class="p-1 text-xs text-muted-foreground">
      That objective is no longer in this workbook. Select another objective.
    </p>
  {:else}
    <InspectionHeader
      title={objective.name || '(unnamed objective)'}
      count={`${blocks.length} ${blocks.length === 1 ? 'question' : 'questions'}`}
      note={`${objective.id} · weight ${objective.weight}`} />

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-3">
      {#if blocks.length === 0}
        <p class="text-xs text-muted-foreground">This objective has no questions yet.</p>
      {:else}
        <QuestionBlockList {blocks} onOpen={onOpenQuestion} />
      {/if}
    </div>
  {/if}
</div>

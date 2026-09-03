<script lang="ts">
  import QuestionBlock from './question-block.svelte';
  import type { QuestionBlockView } from './question-blocks';

  // Several questions in a rail, stacked tight so the gap before the next group heading
  // stays the bigger break. Every rail that lists questions renders this.
  let {
    blocks,
    onOpen,
  }: { blocks: QuestionBlockView[]; onOpen?: ((id: string) => void) | undefined } = $props();
</script>

<div class="space-y-2">
  {#each blocks as block (block.questionId)}
    <QuestionBlock
      questionId={block.questionId}
      text={block.text}
      chips={block.chips}
      units={block.units}
      {onOpen} />
  {/each}
</div>

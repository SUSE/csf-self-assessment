<script lang="ts">
  import type { DuplicateWarning } from '../../author';
  import QuestionLink from './question-link.svelte';

  // One similar pair, both ends openable. The Jaccard index is shown but decides
  // nothing: whether the two turn on the same underlying fact is the author's call.
  type Props = {
    pair: DuplicateWarning;
    onOpenQuestion: (questionId: string) => void;
  };
  let { pair, onOpenQuestion }: Props = $props();
</script>

<li class="flex flex-wrap items-baseline gap-x-1 px-1 py-1.5">
  <QuestionLink questionId={pair.aId} onOpen={onOpenQuestion} />
  <span class="text-xs text-muted-foreground" aria-label="is similar to">~</span>
  <QuestionLink questionId={pair.bId} onOpen={onOpenQuestion} />
  <span
    class="ml-auto text-xs tabular-nums text-muted-foreground"
    title="Jaccard index over content words — a text signal, not a verdict"
  >J {pair.jaccard.toFixed(3)}</span>
</li>

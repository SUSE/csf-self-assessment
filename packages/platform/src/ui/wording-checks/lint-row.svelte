<script lang="ts">
  import type { QuestionLint } from '../../author';
  import { Chip } from '../chip';
  import QuestionLink from './question-link.svelte';
  import { lintLabel, lintReason } from './model';

  // One question's lint findings: the question, then a pill per finding.
  type Props = {
    entry: QuestionLint;
    onOpenQuestion: (questionId: string) => void;
  };
  let { entry, onOpenQuestion }: Props = $props();
</script>

<li class="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 py-1.5">
  <QuestionLink questionId={entry.questionId} onOpen={onOpenQuestion} />
  {#each entry.findings as finding, i (i)}
    <Chip tone="attention" size="sm" title={lintReason(finding)}>{lintLabel(finding)}</Chip>
  {/each}
</li>

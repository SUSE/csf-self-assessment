<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import type { Question, Seal } from '../../schema';
  import RatioBar from '../dashboard/ratio-bar.svelte';
  import { SealBadge } from '../seal-badge';
  import QuestionRow from '../workbook-facts/question-row.svelte';

  // One rung of the binding ramp. The header is the finding and the questions are
  // its evidence, so the header is the disclosure — flat, five rungs bury the bars
  // under two dozen grey lines in an 18rem rail.
  //
  // Rows carry no seal: the rung above them is already the badge.
  type Props = {
    seal: Seal;
    /** The rung's authored name, blank when the workbook does not name it. */
    name: string;
    questions: Question[];
    /** This rung's share of the binding answers, for the bar's width. */
    share: number;
    /** Open at rest — the cap rung is the one the reader came for. */
    open?: boolean;
    /** Given, each question is the control that opens it on the fill surface. */
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { seal, name, questions, share, open = false, onOpenQuestion }: Props = $props();

  const initialExpanded = () => open;
  let expanded = $state(initialExpanded());
  const uid = $props.id();
  const listId = `${uid}-questions`;
</script>

<li>
  <button
    type="button"
    aria-expanded={expanded}
    aria-controls={listId}
    onclick={() => (expanded = !expanded)}
    class="flex w-full items-center gap-2 rounded-md border border-transparent px-1 py-1 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  >
    <SealBadge {seal} />
    <span class="min-w-0 flex-1">
      <span class="flex items-baseline justify-between gap-2">
        <span class="truncate text-xs font-medium text-foreground">{name || `SEAL-${seal}`}</span>
        <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{questions.length}</span>
      </span>
      <RatioBar fraction={share} fill={seal} class="mt-1" />
    </span>
    <ChevronDown
      class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none {expanded
        ? 'rotate-180'
        : ''}"
    />
  </button>

  {#if expanded}
    <ul id={listId} class="mt-0.5 pl-7">
      {#each questions as question (question.id)}
        <QuestionRow {question} onSelect={onOpenQuestion} />
      {/each}
    </ul>
  {/if}
</li>

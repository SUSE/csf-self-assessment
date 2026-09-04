<script lang="ts">
  import type { Answer, Party, Workbook } from '../../schema';
  import { questionLowestSeal } from '../question-inspector';
  import ObjectiveHeading from './objective-heading.svelte';
  import QuestionRow from './question-row.svelte';

  // Every question the workbook asks, grouped by the objective it scores — the
  // instrument's whole text in reading order, one panel per objective.
  
  // Pass `answers` and the assessment's concrete `parties` and each row also carries
  // the lowest SEAL selected against that question, so one list says both what is
  // asked and how the estate is doing on it. With no answers the seal is omitted
  // entirely rather than shown as a dash — no assessment loaded is not the same fact
  // as unanswered.
  
  // No Panel per objective. A card holding a stack of carded rows is a card in a
  // card, and at eight objectives it put ~50 rectangles on screen for 35 questions.
  // Each group is a plain section: a ruled heading, then bare rows. Grouping is
  // whitespace and one hairline, which is what the rest of the system uses anyway.
  
  // One column, full bleed. A row spends the whole width it is given (user, standing):
  // no measure cap and no wrapping into columns — the scope column rides the right
  // edge and the question text takes the rest.
  type Props = {
    workbook: Workbook;
    /** Concrete declared parties, when an assessment is loaded (party-axis seals).*/
    parties?: Party[];
    answers?: Answer[];
    /** Inspect one question — the row becomes the control that opens it.*/
    onSelect?: ((id: string) => void) | undefined;
    /** The question currently open elsewhere (the right rail).*/
    selectedId?: string | null;
    /** Restrict to these question ids — the participant's claim walk. Objectives it
     * leaves empty drop out entirely. absent lists the whole workbook.*/
    scope?: readonly string[] | undefined;
  };
  let {
    workbook,
    parties = [],
    answers = [],
    onSelect,
    selectedId = null,
    scope,
  }: Props = $props();

  const scored = $derived(answers.length > 0);

  const groups = $derived(
    scope === undefined
      ? workbook.objectives
      : workbook.objectives
          .map((o) => ({ ...o, questions: o.questions.filter((q) => scope.includes(q.id)) }))
          .filter((o) => o.questions.length > 0),
  );
</script>

<div class="space-y-8">
  {#each groups as objective (objective.id)}
    <section>
      <div class="border-b border-border px-2 pb-1.5">
        <ObjectiveHeading {objective} />
      </div>
      {#if objective.questions.length === 0}
        <p class="px-2 pt-2 text-sm leading-6 text-muted-foreground">No questions.</p>
      {:else}
        <!-- The gap BETWEEN rows has to beat the gap between a row's own wrapped
     lines, or a two-line question reads as two rows. 24px line + 16px
     padding + 4px = 36 against 24. -->
        <ul class="space-y-0.5 pt-1">
          {#each objective.questions as question (question.id)}
            <QuestionRow
              {question}
              seal={scored ? questionLowestSeal(workbook, parties, answers, question) : undefined}
              selected={selectedId === question.id}
              {onSelect}
            />
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
</div>

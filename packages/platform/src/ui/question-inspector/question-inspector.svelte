<script lang="ts">
  import type { Answer, Landing, Party, Question, Target, Workbook } from '../../schema';
  import { Inset } from '../panel';
  import { targetKey } from '../../assessment';
  import { questionBlame } from '../../merge';
  import { targetLabel } from '../../utils/target-label';
  import {
    questionUnitSeals,
    questionLowestSeal,
    answeredUnitCount,
    dimensionCoverage,
    partyCoverage,
    assessmentSeal,
    answerLadder,
  } from './model';
  import QuestionBlame from './question-blame.svelte';
  import QuestionIdentity from './question-identity.svelte';
  import { SealBadge } from '../seal-badge';
  import DimensionCoverageRow from './dimension-coverage-row.svelte';
  import PartyCoverageRow from './party-coverage-row.svelte';
  import AnswerLadder from './answer-ladder.svelte';

  // The right-rail question detail (facilitator Questions section). It READS one
  // question of the current workbook and, when an answered assessment is loaded,
  // the SEALs selected for it: the lowest selected rank up top (the estate reads
  // this question's floor from it), each covered dimension / party / stratum with
  // its own selected seal, and the answer ladder with the chosen rung(s) marked —
  // so the list badge, the per-unit seals, and the ladder all read as one glance.
  // It COUNTS nothing and never edits. the shaping is pure (see ./model) and the
  // seals come from `answers` verbatim. This file is composition only.
  type Props = {
    workbook: Workbook;
    question: Question;
    /** Concrete declared parties (party-axis fans over these). = none loaded.*/
    parties?: Party[];
    /** The loaded assessment's answers. = a bare workbook, nothing selected.*/
    answers?: Answer[];
    /** The merge ledger behind the loaded assessment. = nothing landed, and
     * the blame section does not render.*/
    ledger?: Landing[];
    /** The exact answer unit to select, when the rail was opened from a Landing
     * panel (§4.6). Null = the whole question.*/
    target?: Target | null;
  };
  let { workbook, question, parties = [], answers = [], ledger = [], target = null }: Props =
    $props();

  const blame = $derived(questionBlame(ledger, question.id, workbook, parties));

  // Seals are the ANSWERED seals — meaningful only when an assessment (a partial
  // or finalized) is loaded. A bare workbook / unfilled workbook-assessment has
  // none, so we show the structure without a row of "–" that reads as broken.
  const hasAnswers = $derived(answers.length > 0);
  const unitSeals = $derived(questionUnitSeals(workbook, parties, answers, question));
  const lowest = $derived(questionLowestSeal(workbook, parties, answers, question));
  const answeredCount = $derived(answeredUnitCount(unitSeals));
  const dims = $derived(dimensionCoverage(workbook, question, unitSeals));
  const partyRows = $derived(partyCoverage(workbook, parties, question, unitSeals));
  const estateSeal = $derived(assessmentSeal(question, unitSeals));
  const rungs = $derived(answerLadder(workbook, question, unitSeals, lowest));
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  <!-- Header: the question, then the lowest selected seal + role + grain. -->
  <div class="shrink-0 space-y-2 border-b border-border pb-3">
    <h3 class="text-pretty font-semibold leading-snug text-foreground">{question.text || '(untitled question)'}</h3>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      {#if !hasAnswers}
        <span class="text-xs text-muted-foreground">No assessment loaded — import a returned partial to see the answered SEALs.</span>
      {:else}
        <SealBadge seal={lowest} size="md" />
        <span class="text-xs text-muted-foreground">
          {#if lowest === null}
            not answered yet
          {:else}
            lowest selected · SEAL-{lowest}{answeredCount > 1 ? ` of ${answeredCount} answered` : ''}
          {/if}
        </span>
      {/if}
    </div>
    {#if target !== null}
      <p class="text-xs text-muted-foreground" data-selected-unit={targetKey(target)}
        >Selected unit: {targetLabel(workbook, parties, target)}</p
      >
    {/if}
    <QuestionIdentity {workbook} {question} />
  </div>

  <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pt-3">
    {#if question.why}
      <aside class="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">{question.why}</aside>
    {/if}

    <!-- Breakdown: what the question fans over, each with its selected seal. -->
    <section class="space-y-1.5">
      {#if question.grain === 'dimension'}
        <h4 class="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Applies to {dims.length} dimension{dims.length === 1 ? '' : 's'}
        </h4>
        <ul class="space-y-1">
          {#each dims as d (d.id)}
            <DimensionCoverageRow dimension={d} showSeal={hasAnswers} />
          {/each}
        </ul>
      {:else if question.axis === 'party'}
        <h4 class="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          One answer per declared party
        </h4>
        {#if partyRows.length > 0}
          <ul class="space-y-1">
            {#each partyRows as p (p.id)}
              <PartyCoverageRow party={p} showSeal={hasAnswers} />
            {/each}
          </ul>
        {:else}
          <Inset as="p" density="none" class="rounded-md px-2 py-1.5 text-xs text-muted-foreground">
            No parties declared yet — load a partial to see per-party answers.
          </Inset>
        {/if}
      {:else}
        <h4 class="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</h4>
        <Inset density="none" class="flex items-center gap-2 rounded-md px-2 py-1.5">
          {#if hasAnswers}<SealBadge seal={estateSeal} />{/if}
          <span class="text-xs text-muted-foreground">Asked once for the whole estate.</span>
        </Inset>
      {/if}
    </section>

    <!-- The answer ladder: the rungs a participant chooses between (SEAL-0 → 4),
     with the selected rung(s) marked and the lowest flagged as binding. -->
    <AnswerLadder {rungs} />

    {#if blame.length > 0}
      <QuestionBlame {blame} {question} selected={target ?? null} />
    {/if}
  </div>
</div>

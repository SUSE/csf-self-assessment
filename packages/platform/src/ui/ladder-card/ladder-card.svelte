<script lang="ts">
  import type { Answer, PartyQuestion, SealLevel, RoleDef } from '../../schema';
  import type { LadderChoice, QuestionCoverage } from '../../assessment';
  import { rungAtPosition, sealOfAnswer } from '../../assessment';
  import { sealName } from '../../score-engine';
  import { Ladder } from '../ladder';
  import { OffLadder } from '../off-ladder';
  import { CommitStrip } from '../commit-strip';
  import { AnswerColumns } from '../answer-columns';
  import { QuestionHeader } from '../question-header';
  import { Panel } from '../panel';
  import { TextField } from '../forms';
  import { handleCardKeydown } from '../card-keys';

  // The single-unit card (assessment axis / single-answer): one answer, no tray to
  // drag. Nobody knows / Doesn't apply are OFF-LADDER ROWS inside the ladder (spec
  // §4.8 / ADR-0009) — the same unified answer column the fan-out cards use, so the
  // single-unit question reads consistently: rungs 4→0, then the two off-ladder
  // rows. The chosen off-ladder row shows a neutral tick (via `selectedOff`); the
  // n/a reason field lives in the qualify column.
  type Props = {
    question: PartyQuestion;
    sealLevels: SealLevel[];
    roles: RoleDef[];               // NEW — resolve question.role → role.name
    answer: Answer | undefined; // required prop; pass undefined when unanswered
    coverage: QuestionCoverage;
    onChoose: (choice: LadderChoice) => void;
    onEvidence: (note: string) => void;   // NEW — set the placed answer's whole-group evidence
    onNext: () => void;                    // NEW — advance to the next question
    onReason: (reason: string) => void;   // NEW — set the placed n/a answer's reason
    onReset: () => void;                   // clear this question back to as-loaded
    canReset: boolean;                     // false → reset control disabled (nothing placed)
  };

  let { question, sealLevels, roles, answer, coverage, onChoose, onEvidence, onNext, onReason, onReset, canReset }: Props = $props();

  // The role read as a person (§4.11): the resolved name is the loud element,
  // the raw id kept as a small muted chip.
  const roleName = $derived(roles.find((r) => r.id === question.role)?.name ?? question.role);
  const selectedOff = $derived<'dont-know' | 'na' | null>(
    answer?.state === 'dont-know' ? 'dont-know' : answer?.state === 'na' ? 'na' : null,
  );
  const answeredSeal = $derived(answer === undefined ? null : sealOfAnswer(question, answer));

  // `$state`, not a plain `let`: `bind:ref` on a component is a two-way prop
  // binding, and Svelte only propagates the assignment through reactive state.
  let cardEl = $state<HTMLElement | null>(null);
</script>

<svelte:window
  onkeydown={(e) =>
    handleCardKeydown(e, cardEl, {
      place: (position) => {
        const r = rungAtPosition(question, position);
        if (r) onChoose({ state: 'answered', rungId: r.id });
      },
      dontKnow: () => onChoose({ state: 'dont-know' }),
      na: () => onChoose({ state: 'na' }),
      next: () => onNext(),
    })}
/>

<Panel as="div" bind:ref={cardEl} density="xl" class="space-y-6">
  <QuestionHeader
    {roleName}
    role={question.role}
    materiality={question.defaultMateriality}
    text={question.text}
    why={question.why}
    {coverage}
    grainLabel="asked once for the whole assessment"
    {onReset}
    {canReset}
  />

  <AnswerColumns>
    {#snippet scale()}
      <div class="space-y-2">
        <span class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">The ladder</span>
        <Ladder
          rungs={question.ladder}
          {sealLevels}
          selected={answer?.state === 'answered' ? answer.rungId : null}
          ariaLabel={question.text}
          onSelect={(rungId) => onChoose({ state: 'answered', rungId })}
        />
      </div>
    {/snippet}

    {#snippet qualify()}
      <!-- Escape hatches ride the RIGHT column, top-aligned with the ladder, so the X
           real estate carries them instead of pushing the answer list down the page. -->
      <OffLadder
        {selectedOff}
        onOffLadder={(kind) => onChoose(kind === 'na' ? { state: 'na' } : { state: 'dont-know' })}
      />

      {#if answer?.state === 'answered' && answeredSeal !== null}
        <CommitStrip
          seal={answeredSeal}
          levelName={sealName(sealLevels, answeredSeal)}
          evidence={answer.evidence ?? ''}
          {onEvidence}
        />
      {/if}

      {#if answer?.state === 'na'}
        <TextField
          label="Why doesn’t it apply?"
          density="compact"
          value={answer.reason ?? ''}
          oninput={(e) => onReason(e.currentTarget.value)}
        />
      {/if}
    {/snippet}
  </AnswerColumns>
</Panel>

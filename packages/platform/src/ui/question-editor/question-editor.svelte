<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Answer, Question, Workbook } from '../../schema';
  import { QuestionSchema } from '../../schema';
  import { defaultParties } from '../../assessment';
  import {
    addRung,
    clearEstateAnswer,
    moveRung,
    removeRung,
    setEstateAnswer,
    toggleAppliesTo,
    updateQuestion,
    updateRung,
  } from '../../author';
  import { QuestionFill } from '../fill-surface';
  import { RecommendationLinksRow } from '../recommendations-editor';
  import { Button } from '../button';
  import { Textarea, IssueList } from '../forms';
  import { Inset, Panel, eyebrowVariants } from '../panel';
  import { cn } from '../../utils/cn';
  import DimensionToggle from './dimension-toggle.svelte';
  import EstateAnswerRow from './estate-answer-row.svelte';
  import QuestionMetaStrip from './question-meta-strip.svelte';
  import RungRow from './rung-row.svelte';
  import { QUIET_FIELD } from './quiet-field';

  // WYSIWYG question editing: the ladder editor IS the ladder — the
  // rungs that exist, in authored order, applicability picked as dimension chips,
  // grain toggled on the card, role badge and why-line edited where the
  // participant reads them.
  
  // The card therefore wears the PARTICIPANT'S GEOMETRY, not a form's: the fill
  // card's header (identity strip → the question, loud → the why in its left-ruled
  // aside) over the fill card's body split (ui/answer-columns: the graded scale
  // left, everything that qualifies it right). Preview flips the card from edit to
  // fill, not a separate world — so the flip has to change the affordances and
  // leave the layout where it was.
  
  // The split is flex-wrap, not a `lg:` grid, because the width this card gets is a
  // function of the two collapsible side panels rather than of the viewport: the
  // columns must fold when the rail narrows, whoever narrowed it.
  
  // The editor holds NO edit logic — every change calls a pure op and emits the
  // whole next Workbook (design rule 1) — and every repeated part is a sibling
  // component (the strip, a rung, an estate's answer, a dimension), so this file
  // stays composition.
  type Props = {
    draft: Workbook;
    question: Question;
    issues: ZodIssue[]; // already scoped to this question by the caller
    onDraft: (next: Workbook) => void;
    /** Open a linked recommendation's own editor (the links row's titles).*/
    onOpenRecommendation?: ((recommendationId: string) => void) | undefined;
  };
  let { draft, question, issues, onDraft, onOpenRecommendation }: Props = $props();

  // Union narrowing via $derived (design rule 7).
  const dimensionQ = $derived(question.grain === 'dimension' ? question : null);

  let previewing = $state(false);
  let previewAnswers = $state<Answer[]>([]);

  // The fill face previews against the workbook's own defaults — no
  // wizard inside a card. A card can flip only when the question alone is
  // schema-valid: the flip renders real participant components, which assume a
  // parsed question.
  const previewParties = $derived(defaultParties(draft));
  const previewable = $derived(QuestionSchema.safeParse(question).success);

  // The ladder renders in AUTHORED order (index 0 first): the order the author
  // put the rungs in is the ladder, and nothing here sorts it.
  function estateChoice(estateId: string): string | null {
    return (
      draft.testEstates
        .find((e) => e.id === estateId)
        ?.answers.find((a) => a.questionId === question.id)?.rungId ?? null
    );
  }
  function flip(): void {
    if (!previewing) previewAnswers = [];
    previewing = !previewing;
  }
</script>

<!-- The strip belongs to the question, so it rides both faces: inside the card
     while authoring, on the canvas above the real participant card while
     previewing — where nesting it would put a Panel inside a Panel. -->
{#snippet metaStrip()}
  <QuestionMetaStrip {draft} {question} {previewing} {previewable} onFlip={flip} {onDraft} />
{/snippet}

{#if previewing}
  <div class="space-y-3">
    <!-- `px-6` matches the card's own padding, so the strip does not shift
     sideways as the card flips out from under it. -->
    <div class="px-6">{@render metaStrip()}</div>
    <QuestionFill
      workbook={draft}
      parties={previewParties}
      {question}
      answers={previewAnswers}
      onChange={(a) => (previewAnswers = a)}
      onNext={() => {}}
    />
  </div>
{:else}
  <Panel as="div" density="xl" class="space-y-6">
    {@render metaStrip()}

    <!-- The header block, measured. Capped at 72ch so the question breaks where a
     sentence read aloud breaks (~50 characters at this size) and the why line
     lands inside the 65–75ch a reader can track, however wide the stage gets. -->
    <div class="max-w-[72ch] space-y-2">
      <Textarea
        rows={2}
        data-rule="question"
        class={cn(QUIET_FIELD, 'text-pretty text-2xl font-semibold leading-tight tracking-tight')}
        placeholder="The question, as the participant will read it"
        aria-label="Question text"
        value={question.text}
        oninput={(e) => onDraft(updateQuestion(draft, question.id, { text: e.currentTarget.value }))}
      />
      <!-- The `why` keeps the left-ruled aside it is read from (ui/question-header),
     and states its own standing on hover rather than spending a caption line
     on it at rest. -->
      <div class="group border-l-2 border-border pl-2" data-rule="why">
        <Textarea
          rows={2}
          class={cn(QUIET_FIELD, 'text-reading leading-relaxed text-muted-foreground')}
          placeholder="Why this question exists — capability under stress, one line"
          aria-label="Why line"
          value={question.why ?? ''}
          oninput={(e) => onDraft(updateQuestion(draft, question.id, { why: e.currentTarget.value }))}
        />
        <p
          class="px-2 text-xs text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        >Read aloud, not scored.</p>
      </div>
    </div>

    <div class="flex flex-wrap items-start gap-x-6 gap-y-8">
      <!-- LEFT — the graded scale, the card's subject: what fans out, then the
     ladder itself. -->
      <div class="min-w-0 grow-[3] basis-[34rem] space-y-4">
        {#if dimensionQ}
          <div class="space-y-1.5" data-rule="3.6">
            <p class={eyebrowVariants()}>Applies to</p>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Applies to dimensions">
              {#each draft.dimensions as d (d.id)}
                <DimensionToggle
                  name={d.name}
                  critical={d.critical}
                  pressed={dimensionQ.appliesTo.includes(d.id)}
                  onToggle={() => onDraft(toggleAppliesTo(draft, question.id, d.id))}
                />
              {/each}
            </div>
          </div>
        {/if}

        <div class="space-y-1" data-rule="3.2">
          <div class="flex items-baseline justify-between gap-3">
            <p class={eyebrowVariants()}>The ladder</p>
            <div class="flex items-baseline gap-3">
              <p class="text-xs text-muted-foreground">{question.ladder.length} rungs</p>
              <Button
                variant="ghost"
                size="xs"
                onclick={() => onDraft(addRung(draft, question.id))}
              >Add rung</Button>
            </div>
          </div>
          <div>
            {#each question.ladder as rung, i (rung.id)}
              <RungRow
                {rung}
                position={i + 1}
                total={question.ladder.length}
                sealLevels={draft.sealLevels}
                onPatch={(patch) => onDraft(updateRung(draft, question.id, rung.id, patch))}
                onMove={(move) => onDraft(moveRung(draft, question.id, rung.id, move))}
                onRemove={() => onDraft(removeRung(draft, question.id, rung.id))}
              />
            {/each}
          </div>
        </div>
      </div>

      <!-- RIGHT — what qualifies the ladder: what is wrong with it, how the
     reference estates answer it, and which offers point here. -->
      <div class="min-w-0 grow basis-[18rem] space-y-4">
        {#if issues.length > 0}
          <Inset density="xs" class="space-y-1">
            <p class={cn(eyebrowVariants(), 'text-destructive')}>Issues</p>
            <IssueList issues={issues} />
          </Inset>
        {/if}

        {#if draft.testEstates.length > 0}
          <Inset density="xs" class="space-y-2" data-rule="7">
            <p
              class={eyebrowVariants()}
              title="Which rung would this estate honestly pick? Unanswered counts against the score, never the floor."
            >Test estates</p>
            {#each draft.testEstates as estate (estate.id)}
              <EstateAnswerRow
                estateName={estate.name}
                rungs={question.ladder}
                chosen={estateChoice(estate.id)}
                onPick={(rungId) => onDraft(setEstateAnswer(draft, estate.id, question.id, rungId))}
                onClear={() => onDraft(clearEstateAnswer(draft, estate.id, question.id))}
              />
            {/each}
          </Inset>
        {/if}

        <RecommendationLinksRow
          {draft}
          target={{ kind: 'question', id: question.id }}
          {onDraft}
          onOpen={onOpenRecommendation}
        />
      </div>
    </div>
  </Panel>
{/if}

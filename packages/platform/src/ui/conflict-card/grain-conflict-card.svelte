<script lang="ts">
  import type { ClashChoice, ClashResolution, Question, WorkbookAssessment } from '../../schema';
  import type { GrainClash } from '../../merge';
  import { choiceKey, describeTarget, optionsFor, suggestedChoice } from '../../merge';
  import { targetKey } from '../../assessment';
  import { answerLabel } from '../../utils/answer-label';
  import ConflictLayout from './conflict-layout.svelte';
  import CandidateSide from './candidate-side.svelte';
  import ResolutionChoices from './resolution-choices.svelte';

  // A whole-dimension roll-up against stratum refinements of the same dimension.
  // The stratum side draws the grouped tray-chip silhouette locally: TrayChip
  // itself needs a DnD provider, and the merge screen has none.
  type Props = {
    clash: GrainClash;
    question: Question;
    workbookAssessment: WorkbookAssessment;
    incomingName: string;
    resolution: ClashResolution | undefined;
    note: string;
    onChoose: (choice: ClashChoice) => void;
    onNote: (note: string) => void;
  };
  let { clash, question, workbookAssessment, incomingName, resolution, note, onChoose, onNote }: Props = $props();

  const options = $derived(optionsFor(clash, question));
  const selected = $derived(resolution ? choiceKey(resolution.choice) : null);
  const targetLabel = $derived(describeTarget(clash.target, workbookAssessment));
  const name = $derived(`${clash.questionId}:${targetKey(clash.target)}`);
  const suggestion = $derived(suggestedChoice(clash, workbookAssessment));
  const stratumAuthor = $derived(clash.strata[0]?.candidate.from ?? '');
</script>

{#snippet rollUpSide()}
  <CandidateSide candidate={clash.rollUp} {question} />
{/snippet}

{#snippet stratumSide()}
  <div class="space-y-1">
    <p class="text-sm font-medium text-foreground">
      {stratumAuthor} split it into {clash.strata.length}
    </p>
    <!-- Wraps: the candidate column is now capped, and a six-stratum silhouette
     is wider than it. Wrapping keeps the segments readable where a single
     line would push out of the card. -->
    <span class="inline-flex flex-wrap items-center rounded-full border border-border text-xs text-foreground">
      <span class="px-2 py-0.5 font-medium">{targetLabel}</span>
      {#each clash.strata as stratum (stratum.stratum)}
        <span class="border-l border-border px-2 py-0.5">
          {stratum.stratum} · {answerLabel(question, stratum.candidate.answer)}
        </span>
      {/each}
    </span>
  </div>
{/snippet}

<ConflictLayout
  questionId={clash.questionId}
  {targetLabel}
  clashClass={clash.clash}
  role={question.role}
  questionText={question.text}
  why={question.why}
  {incomingName}
  decided={resolution !== undefined}
  base={clash.rollUpSide === 'base' ? rollUpSide : stratumSide}
  incoming={clash.rollUpSide === 'base' ? stratumSide : rollUpSide}
>
  {#snippet choices()}
    <ResolutionChoices {name} {question} {options} {selected} {suggestion} {note} {onChoose} {onNote} />
  {/snippet}
</ConflictLayout>

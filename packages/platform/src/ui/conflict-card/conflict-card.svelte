<script lang="ts">
  import type { ClashChoice, ClashResolution, Question, WorkbookAssessment } from '../../schema';
  import type { UnitClash } from '../../merge';
  import { choiceKey, describeTarget, optionsFor, suggestedChoice } from '../../merge';
  import { targetKey } from '../../assessment';
  import ConflictLayout from './conflict-layout.svelte';
  import CandidateSide from './candidate-side.svelte';
  import ResolutionChoices from './resolution-choices.svelte';

  // A divergence, a gap or a scope clash: one unit, two candidates, one
  // enumerated choice.
  type Props = {
    clash: UnitClash;
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
</script>

<ConflictLayout
  questionId={clash.questionId}
  {targetLabel}
  clashClass={clash.clash}
  role={question.role}
  questionText={question.text}
  why={question.why}
  {incomingName}
  decided={resolution !== undefined}
>
  {#snippet base()}<CandidateSide candidate={clash.base} {question} />{/snippet}
  {#snippet incoming()}<CandidateSide candidate={clash.incoming} {question} />{/snippet}
  {#snippet choices()}
    <ResolutionChoices {name} {question} {options} {selected} {suggestion} {note} {onChoose} {onNote} />
  {/snippet}
</ConflictLayout>

<script lang="ts">
  import type { ClashChoice, Question } from '../../schema';
  import type { ClashOption, SuggestedChoice } from '../../merge';
  import { reanswerCells } from '../../merge';
  import * as RadioGroup from '../radio-group';
  import { DecisionNote } from '../decision-note';
  import { Label } from '../label';
  import { SealSelector, type SealChoice } from '../seal-selector';

  // The enumerated set as ONE radio group (invariant #9: the set IS the truth)
  // plus the optional note — one click decides a clash; the note gates nothing.
  // The suggestion pre-selects a cell and states its reason beside it; a
  // pre-selection is not a decision (invariant #1).
  type Props = {
    name: string;
    question: Question;
    options: ClashOption[];
    selected: string | null;
    suggestion: SuggestedChoice | null;
    note: string;
    onChoose: (choice: ClashChoice) => void;
    onNote: (note: string) => void;
  };
  let { name, question, options, selected, suggestion, note, onChoose, onNote }: Props = $props();

  const selectedLabel = $derived(options.find((o) => o.key === selected)?.label ?? '');

  // Two shapes, one set: the candidate answers stay sentences, because each one
  // names a person and what they said, while a re-answer is a rung on a ladder —
  // five of those as sentences was a wall of near-identical rows, and as a strip
  // it is the gauge face it always was.
  // The strip is a RUNG strip: each cell is marked with its authored position and
  // tinted by that rung's own SEAL, because a SEAL digit names nothing on a ladder
  // that repeats one.
  const rows = $derived(options.filter((o) => o.choice.kind !== 'reanswer'));
  const cells = $derived(
    reanswerCells(options, question).map(
      (cell): SealChoice => ({
        seal: cell.seal,
        value: cell.key,
        mark: String(cell.position),
        label: cell.label,
      }),
    ),
  );

  // A group value, not a per-input `checked`: the suggestion shows as the pending
  // pick until someone decides, and one value across both shapes is what makes a
  // rung and a candidate mutually exclusive.
  const value = $derived(selected ?? suggestion?.key ?? '');
  const rowId = (key: string): string => `${name}:${key}`.replace(/\s+/g, '-');

  function choose(key: string): void {
    const option = options.find((o) => o.key === key);
    if (option !== undefined) onChoose(option.choice);
  }
</script>

<fieldset class="space-y-2">
  <legend class="text-xs font-medium text-foreground">Resolution</legend>
  <RadioGroup.Root {value} onValueChange={choose} class="gap-1" aria-label={`Resolution for ${name}`}>
    {#each rows as option (option.key)}
      <div class="flex items-center gap-2">
        <!-- `onclick` as well as the group's `onValueChange`: clicking the option
             that is ALREADY the group's value changes nothing, so bits-ui rightly
             stays silent — and the one option that starts as the value is the
             SUGGESTED one, which would then be the only choice nobody could
             accept by clicking it. `upsertResolution` is keyed, so emitting the
             same decision twice is the same decision. -->
        <RadioGroup.Item
          value={option.key}
          id={rowId(option.key)}
          onclick={() => choose(option.key)}
        />
        <Label for={rowId(option.key)} class="text-sm font-normal text-foreground">
          {option.label}
        </Label>
      </div>
    {/each}

    {#if cells.length > 0}
      <!-- The strip is a member of the group above it, not a second control: the
           caption reads into the cells, so the row still says the whole sentence
           the five rows used to say one at a time. -->
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
        <span class="text-sm text-foreground">Re-answer at rung</span>
        <SealSelector choices={cells} onPick={choose} />
      </div>
    {/if}
  </RadioGroup.Root>

  <!-- The same closing beat as the party card's, from one component (ui/decision
       -note), so the two queues a facilitator works in the same sitting end
       identically. Only the open state differs: this axis has a suggestion. -->
  <DecisionNote
    decided={selected === null ? null : selectedLabel}
    noteLabel={`Resolution note for ${name}`}
    {note}
    {onNote}
  >
    {#snippet pending()}
      {#if suggestion !== null}
        <!-- The suggestion is the one option that is pre-selected and NOT yet
             decided (invariant #1), so accepting it has to be a real click
             somewhere — until it was one, the reader's only route to a suggested
             answer was to pick a different option and come back. The sentence
             itself is that control, and it says what pressing it does. -->
        <button
          type="button"
          class="inline-flex max-w-full cursor-pointer flex-wrap items-baseline gap-x-1.5 rounded text-left text-xs text-warning-ink underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          data-suggestion={suggestion.reason}
          onclick={() => choose(suggestion.key)}
        >
          <span>{`Suggested — ${suggestion.reason}`}</span>
          <span class="font-medium whitespace-nowrap">· Accept</span>
        </button>
      {/if}
    {/snippet}
  </DecisionNote>
</fieldset>

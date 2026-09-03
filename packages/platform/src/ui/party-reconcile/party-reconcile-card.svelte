<script lang="ts">
  import type { PartyChoice, PartyDecision, WorkbookAssessment } from '../../schema';
  import type { PartyPair } from '../../merge';
  import { pairSides, pairTitle, partyChoiceKey, partyOptionsFor, servesLabels } from '../../merge';
  import Check from '@lucide/svelte/icons/check';
  import CircleDashed from '@lucide/svelte/icons/circle-dashed';
  import { Chip } from '../chip';
  import { DecisionNote } from '../decision-note';
  import { Label } from '../label';
  import { Card, eyebrowVariants } from '../panel';
  import * as RadioGroup from '../radio-group';

  // One candidate pair as a card (merge.md §2.5): both sides side by side, what
  // an absorb would inherit, and the enumerated choices. The party axis has no
  // authority ladder, so nothing is pre-selected and nothing is suggested —
  // every collapse is a bare human decision (invariant #1).
  type Props = {
    pair: PartyPair;
    workbookAssessment: WorkbookAssessment;
    participantName: string;
    decision: PartyDecision | undefined;
    note: string;
    onChoose: (choice: PartyChoice) => void;
    onNote: (note: string) => void;
  };
  let { pair, workbookAssessment, participantName, decision, note, onChoose, onNote }: Props =
    $props();

  const title = $derived(pairTitle(pair));
  const sides = $derived(pairSides(pair, workbookAssessment, participantName));
  const options = $derived(partyOptionsFor(pair, participantName));
  const group = $derived(`${pair.incoming.id}:${pair.base.id}`);
  const selected = $derived(decision === undefined ? null : partyChoiceKey(decision.choice));
  const decidedLabel = $derived(options.find((o) => o.key === selected)?.label ?? '');

  const list = (ids: readonly string[], empty: string): string => {
    const names = servesLabels(ids, workbookAssessment);
    return names.length === 0 ? empty : names.join(', ');
  };

  // Party ids are author-typed, so an id can carry whitespace; a DOM id cannot.
  const rowId = (key: string): string => `${group}:${key}`.replace(/\s+/g, '-');

  function choose(key: string): void {
    const option = options.find((o) => o.key === key);
    if (option !== undefined) onChoose(option.choice);
  }
</script>

<!-- A Card, wearing the same open/decided state as a clash card (ui/panel): these
     pairs are decided in the same sitting and they gate the same Land button, so
     "still wants you" has to look identical on both. -->
<Card
  state={decision === undefined ? 'open' : 'settled'}
  density="sm"
  class="space-y-3"
  data-pair-class={pair.kind}
  data-pair-decided={decision !== undefined}
  aria-label={title}
>
  <div class="flex flex-wrap items-center gap-2">
    <h4 class="text-sm font-medium text-foreground">{title}</h4>
    {#if decision === undefined}
      <Chip tone="attention" class="ml-auto" data-pair-state="open">
        {#snippet icon()}<CircleDashed class="size-3 shrink-0" aria-hidden="true" />{/snippet}
        open
      </Chip>
    {:else}
      <Chip tone="muted" class="ml-auto" data-pair-state="decided">
        {#snippet icon()}<Check class="size-3 shrink-0" aria-hidden="true" />{/snippet}
        decided
      </Chip>
    {/if}
  </div>

  <!-- ONE grid for the whole pair, not three stacked rows: each side, the serves
       reconciliation and the decision are columns of a single register, so a
       stage-width card is read across instead of leaving two thirds of its width
       empty under a left-packed stack.
       The two sides keep their CAP at every size — split 50/50 across a stage
       they sat ~900px apart, which is the one arrangement that stops a reader
       comparing them — and the serves column keeps a reading measure. The
       decision track is the `1fr`, so it absorbs whatever the stage is wider
       than the facts, instead of leaving a gap at the card's right edge.
       Below xl the row folds: sides side-by-side from sm, serves and decision
       spanning both tracks beneath them. -->
  <div
    class="grid gap-x-6 gap-y-3 sm:grid-cols-[repeat(2,minmax(0,18rem))] xl:grid-cols-[repeat(2,minmax(0,18rem))_minmax(0,22rem)_minmax(0,1fr)]"
  >
    {#each sides as side, i (side.from)}
      <div
        class={[
          'space-y-0.5 text-sm',
          i > 0 && 'sm:border-l sm:border-border sm:pl-6',
        ]}
      >
        <p class={eyebrowVariants({ weight: 'medium' })}>{side.from}</p>
        <p class="font-medium text-foreground">{side.party.name}</p>
        <p class="text-xs text-muted-foreground">({side.party.id}) · {side.typeName}</p>
        <p class="text-xs text-muted-foreground">{list(side.party.serves, 'none')}</p>
      </div>
    {/each}

    <div
      class="space-y-0.5 text-xs text-muted-foreground sm:col-span-2 xl:col-span-1 xl:border-l xl:border-border xl:pl-6"
    >
      <p data-serves-shared>Both serve: {list(pair.serves.shared, 'none')}</p>
      <p data-serves-base-only>Only on {pair.base.name}: {list(pair.serves.baseOnly, 'none')}</p>
      <p data-serves-inherits>
        Absorbing inherits: {list(pair.serves.incomingOnly, 'nothing new')}
      </p>
    </div>

    <fieldset
      class="space-y-2 sm:col-span-2 xl:col-span-1 xl:border-l xl:border-border xl:pl-6"
    >
      <legend class="text-xs font-medium text-foreground">Decision</legend>
      <!-- The same control as the clash card's Resolution (ui/conflict-card):
           one `RadioGroup.Root` owning the value, with a `<Label for>` carrying
           each option's sentence so the words are part of the radio's hit area.
           `onclick` as well as `onValueChange` because pressing the option that
           already IS the value changes nothing, so bits-ui rightly stays silent —
           here that re-affirms a decision already taken, which `upsertPartyDecision`
           treats as the same decision.
           Nothing is pre-selected on this axis: the party pair has no authority
           ladder, so `value` is empty until a human picks (invariant #1). -->
      <RadioGroup.Root
        value={selected ?? ''}
        onValueChange={choose}
        class="gap-1"
        aria-label={`Decision for ${title}`}
      >
        {#each options as option (option.key)}
          <div class="flex items-start gap-2">
            <RadioGroup.Item
              value={option.key}
              id={rowId(option.key)}
              class="mt-0.5"
              onclick={() => choose(option.key)}
            />
            <Label for={rowId(option.key)} class="text-sm font-normal text-foreground">
              {option.label}
            </Label>
          </div>
        {/each}
      </RadioGroup.Root>
      <!-- The same closing beat as the clash card's, from one component: what was
           decided, then the ledger note. The party axis has no suggestion, so it
           passes no `pending`. -->
      <DecisionNote
        decided={decision === undefined ? null : decidedLabel}
        noteLabel={`Party note for ${group}`}
        {note}
        {onNote}
      />
    </fieldset>
  </div>
</Card>

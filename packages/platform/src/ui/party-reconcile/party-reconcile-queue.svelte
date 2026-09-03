<script lang="ts">
  import type { Party, PartyChoice, PartyDecision, WorkbookAssessment } from '../../schema';
  import type { PartyPair } from '../../merge';
  import { Panel, PanelHeader, eyebrowVariants } from '../panel';
  import PartyReconcileCard from './party-reconcile-card.svelte';

  // The party axis of one landing, decided before the answers: a party decision
  // rewrites answer targets, so it manufactures — or spares — clashes downstream
  // (merge.md §2.5). Owns view state only; every list comes from merge/parties.ts.
  type Props = {
    workbookAssessment: WorkbookAssessment;
    pairs: PartyPair[];
    additions: Party[];
    parties: Party[];
    decisions: PartyDecision[];
    participantName: string;
    onDecide: (decision: PartyDecision) => void;
  };
  let {
    workbookAssessment,
    pairs,
    additions,
    parties,
    decisions,
    participantName,
    onDecide,
  }: Props = $props();

  // Per-pair draft notes, keyed like the card's radio group. Kept local: a note
  // only becomes data when a decision is emitted.
  let notes = $state<Record<string, string>>({});

  const keyOf = (pair: PartyPair): string => `${pair.incoming.id}:${pair.base.id}`;
  const typeName = (party: Party): string =>
    workbookAssessment.workbook.parties.find((t) => t.id === party.type)?.name ?? party.type;

  function decisionFor(pair: PartyPair): PartyDecision | undefined {
    return decisions.find((d) => d.added === pair.incoming.id);
  }
  function choose(pair: PartyPair, choice: PartyChoice): void {
    onDecide({ added: pair.incoming.id, choice, note: (notes[keyOf(pair)] ?? '').trim() });
  }
  function note(pair: PartyPair, text: string): void {
    notes[keyOf(pair)] = text;
    const existing = decisionFor(pair);
    if (existing !== undefined) onDecide({ ...existing, note: text.trim() });
  }

  const label = eyebrowVariants();
</script>

<!-- A Panel, like every other section of the Merge review (see landing-header). -->
<Panel class="space-y-4" aria-label="Party reconcile" data-party-queue>
  <div class="space-y-1">
    <!-- "Parties", not "Providers": the roster carries the assessed institution
         alongside the third parties, and provider is only one of the workbook's
         party types (CONTEXT.md's ubiquitous language). -->
    <PanelHeader title="Parties" />
    <!-- Not PanelHeader's `description`: the count is a probe target
         (`data-party-count`), and the header's description is a plain string. -->
    <p class="text-sm text-muted-foreground" data-party-count>
      {pairs.length} pair{pairs.length === 1 ? '' : 's'} to reconcile ·
      {parties.length} estate part{parties.length === 1 ? 'y' : 'ies'}
    </p>
  </div>

  <!-- The ordering instruction belongs to the pairs and is rendered with them.
       Standing over an empty queue it was the panel's most emphatic sentence
       pointing at no work — "decide these first" with no `these`. -->
  {#if pairs.length > 0}
    <div class="space-y-2">
      <p class="max-w-[68ch] text-xs text-muted-foreground">
        Decide these first: a party decision rewrites the incoming answers’ targets,
        so it changes which units clash.
      </p>
      <ul class="space-y-3">
        {#each pairs as pair (keyOf(pair))}
          <li data-party-pair={keyOf(pair)}>
            <PartyReconcileCard
              {pair}
              {workbookAssessment}
              {participantName}
              decision={decisionFor(pair)}
              note={notes[keyOf(pair)] ?? ''}
              onChoose={(choice) => choose(pair, choice)}
              onNote={(text) => note(pair, text)}
            />
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Additions are a MANIFEST, not a queue: each is a fact that needs nothing
       from the facilitator, so it gets a register — an eyebrow that says once
       what every row used to repeat ("joins as a new party"), and rows carrying
       only what differs. They flow into columns on the panel's own width rather
       than stacking as one full-bleed box per name, because a boxed row spanning
       the stage for thirty characters both wastes the width and promises a
       control that isn't there. The hairline above each row is the separator the
       box used to be, and it lines the columns up as one register.
       `auto-fill` rather than a breakpoint: the column COUNT follows the width on
       its own — two on a squeezed panel, six on a wide stage — so a track stays
       near a name's own length at every size and nothing has to guess. The type
       sits beside its name rather than at the track's far edge: at this item
       count a leader gap costs more than the alignment it would buy. -->
  {#if additions.length > 0}
    <div class="space-y-2">
      <p class={label}>Joining the estate · no decision needed</p>
      <ul
        class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-6"
        aria-label="New parties"
      >
        {#each additions as addition (addition.id)}
          <li
            class="flex flex-wrap items-baseline gap-x-2 border-t border-border py-1 text-sm text-foreground"
            data-party-addition={addition.id}
          >
            {addition.name}
            <span class="text-xs text-muted-foreground">· {typeName(addition)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if pairs.length === 0 && additions.length === 0}
    <p class="text-sm text-muted-foreground" data-party-empty>
      This landing changes nothing on the party axis.
    </p>
  {/if}
</Panel>

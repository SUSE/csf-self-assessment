<script lang="ts">
  import type { GateEntry } from '../../author';
  import type { Workbook } from '../../schema';
  import { Panel, PanelHeader, Well } from '../panel';
  import { RuleCite } from '../rulebook';
  import GateRowItem from './gate-row.svelte';
  import { gateRows } from './model';

  // The floor gates on the Author overview: every material question that can pin
  // the whole assessment's SEAL floor. Carried over from the retired Author HUD —
  // it is the only surface that answers "what in here can floor us", and unlike
  // the HUD each row now OPENS the question it names.
  //
  // Presentation only: every value comes off `gateRows`.
  type Props = {
    gates: GateEntry[];
    workbook: Workbook;
    onOpenQuestion: (questionId: string) => void;
  };
  let { gates, workbook, onOpenQuestion }: Props = $props();

  const rows = $derived(gateRows(gates, workbook));
</script>

<Panel class="space-y-4">
  <PanelHeader title="Floor gates" tone="eyebrow" level={2}>
    {#snippet actions()}<RuleCite section="6" />{/snippet}
  </PanelHeader>

  <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs">
    <p class="text-muted-foreground">
      A material question gates: through the party answers, or through a critical
      dimension. One SEAL-0 answer on any row below floors the whole assessment —
      the floor is a minimum, never an average.
    </p>
    {#if rows.length > 0}
      <p class="text-foreground">
        {rows.length} question{rows.length === 1 ? '' : 's'} can floor the estate.
      </p>
    {/if}
  </div>

  {#if rows.length === 0}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">
        Nothing gates yet — a question gates once it is material and either asks per
        party or reaches a dimension flagged critical.
      </p>
    </Well>
  {:else}
    <!-- Capped: 24 of the estate workbook's 35 questions gate, and an overview panel
         that runs 750px tall stops being a glance. The count above says how many;
         this is where you find WHICH. -->
    <ul class="max-h-96 divide-y divide-border/60 overflow-y-auto border-y border-border/60">
      {#each rows as row (row.questionId)}
        <GateRowItem {row} onOpen={onOpenQuestion} />
      {/each}
    </ul>
  {/if}
</Panel>

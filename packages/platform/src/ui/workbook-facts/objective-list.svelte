<script lang="ts">
  import type { Objective } from '../../schema';
  import { eyebrowVariants, Panel, PanelHeader } from '../panel';
  import { METRIC_CELL } from './metric-cell.svelte';
  import ObjectiveRow from './objective-row.svelte';

  // The sovereignty objectives (SOV) the instrument scores, read-only. An Inset per
  // objective rather than a table, but the two quantities are columned: the units are
  // named once here, and each row's bars are drawn against the column's own maximum,
  // so question mass and score weight can be compared — and their mismatch seen —
  // straight down the list.
  type Props = {
    objectives: Objective[];
    title?: string;
  };
  let { objectives, title = 'Objectives' }: Props = $props();

  const maxQuestions = $derived(
    Math.max(1, ...objectives.map((objective) => objective.questions.length)),
  );
  const maxWeight = $derived(Math.max(1, ...objectives.map((objective) => objective.weight)));
</script>

<Panel class="space-y-3">
  <PanelHeader {title} tone="eyebrow" level={2} />
  {#if objectives.length === 0}
    <p class="text-xs text-muted-foreground">This workbook has no objectives, so it scores nothing.</p>
  {:else}
    <div class="space-y-1">
      <!-- The header sits on the rows' own grid: a transparent border and the same
           px-2 put its labels over the cells they name. -->
      <div class="flex items-center gap-2 border border-transparent px-2">
        <span class="min-w-0 flex-1"></span>
        <span class={`${METRIC_CELL} ${eyebrowVariants()}`}>Questions</span>
        <span class={`${METRIC_CELL} ${eyebrowVariants()}`}>Weight</span>
      </div>
      <ul class="space-y-1">
        {#each objectives as objective (objective.id)}
          <ObjectiveRow {objective} {maxQuestions} {maxWeight} />
        {/each}
      </ul>
    </div>
  {/if}
</Panel>

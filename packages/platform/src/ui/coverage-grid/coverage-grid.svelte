<script lang="ts">
  import type { CoverageGauge } from '../../author';
  import type { Workbook } from '../../schema';
  import { Panel, PanelHeader, Well } from '../panel';
  import { RuleCite } from '../rulebook';
  import CoverageHeadCell from './coverage-head-cell.svelte';
  import CoverageRow from './coverage-row.svelte';
  import { coverageGridModel } from './model';

  // Coverage on the Author overview: which dimension each objective's
  // dimension-grain questions reach. Carried over from the retired Author HUD,
  // because it is the one reading no other surface gives — the instrument wheel
  // shows a dimension's TOTAL and draws the uncovered ones as stubs, but only the
  // cross-tab says WHICH objective leaves a hole.
  
  // Presentation only: every value comes off `coverageGridModel`.
  type Props = {
    coverage: CoverageGauge;
    workbook: Workbook;
    /** Open the Dimensions page, flashing the named row.*/
    onOpenDimension: (dimensionId: string) => void;
    /** Open one objective's editor.*/
    onOpenObjective: (objectiveId: string) => void;
  };
  let { coverage, workbook, onOpenDimension, onOpenObjective }: Props = $props();

  const model = $derived(coverageGridModel(coverage, workbook));
</script>

<Panel class="space-y-4">
  <PanelHeader title="Coverage" tone="eyebrow" level={2}>
    {#snippet actions()}<RuleCite section="7" />{/snippet}
  </PanelHeader>

  <!-- Intro and verdict on one line, the shape the recommendation readout uses:
     the reader should not have to pass the grid to reach its conclusion. -->
  <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs">
    <p class="text-muted-foreground">
      Every dimension-grain question, counted against the dimension it reaches. A
      column no question touches is a dimension the instrument cannot read at all.
    </p>
    {#if model.verdict}
      <p class="text-foreground">{model.verdict}</p>
    {/if}
  </div>

  {#if model.rows.length === 0 || model.columns.length === 0}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">
        Add objectives and dimensions to read coverage.
      </p>
    </Well>
  {:else}
    <!-- NO `w-full`: a cross-tab of single digits has a natural size, so the table
     shrink-wraps to its ids and there is no surplus width for auto layout to
     spend as 300px of inter-column padding. Each head caps its own width
     instead, so one long dimension id cannot stretch the stage. -->
    <div class="overflow-x-auto">
      <table class="text-xs">
        <thead>
          <tr>
            <th scope="col" class="pb-1 pr-2 text-left font-normal text-muted-foreground">obj</th>
            {#each model.columns as column (column.dimensionId)}
              <CoverageHeadCell {column} onOpen={onOpenDimension} />
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each model.rows as row (row.objectiveId)}
            <CoverageRow {row} onOpen={onOpenObjective} />
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Panel>

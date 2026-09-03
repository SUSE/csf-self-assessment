<script lang="ts">
  import { heatDetail, heatTile, type HeatAxisId } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { heatMarkBlocks } from './question-blocks';

  // ONE Inspector view: the answers behind one mark on a heat grid (analytics §4.4.3),
  // read as the questions they answer. Derived from the live result every render, so a
  // mark whose row or column the workbook no longer has resolves to nothing.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    axis: HeatAxisId;
    /** The pressed mark's key (heatMarkKey). */
    mark: string;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, axis, mark, onOpenQuestion }: Props = $props();

  const detail = $derived(
    result && workbook
      ? heatDetail(heatTile(result, workbook, parties, axis), mark, workbook, parties)
      : null,
  );
  const reading = $derived(detail === null ? null : heatMarkBlocks(detail));
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if detail === null || reading === null}
    <p class="p-1 text-xs text-muted-foreground">
      Press a cell on a weakness grid to see the answers behind it.
    </p>
  {:else}
    <InspectionHeader
      title={detail.title}
      count={`${detail.rows.length} ${detail.rows.length === 1 ? 'answer' : 'answers'}`}
      note={detail.summary} />

    {#if reading.shared}
      <h4
        class="shrink-0 truncate pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        title={reading.shared}>
        {reading.shared}
      </h4>
    {/if}

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-3">
      <QuestionBlockList blocks={reading.blocks} onOpen={onOpenQuestion} />
    </div>
  {/if}
</div>

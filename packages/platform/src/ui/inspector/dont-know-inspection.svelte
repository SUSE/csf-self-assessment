<script lang="ts">
  import { dontKnowTile, type DontKnowRow } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import GroupHeading from './group-heading.svelte';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { dontKnowBlocks } from './question-blocks';

  // ONE Inspector view: what the estate admits it does not know, read as the questions
  // it is admitted on, split into what gates the floor and what moves no number
  // (product). Derived live, so an admission since answered resolves away.
  type Props = {
    /** The reading on screen — the same triple the tile is given.*/
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    /** Open a question where this app puts it (the editor, the fill surface).*/
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, onOpenQuestion }: Props = $props();

  const view = $derived(result && workbook ? dontKnowTile(result, workbook, parties) : null);
  const admitted = $derived(view?.kind === 'admitted' ? view : null);

  const group = (label: string, rows: DontKnowRow[]) => ({
    key: label,
    label,
    units: rows.length,
    blocks: dontKnowBlocks(rows),
  });
  const groups = $derived(
    admitted === null
      ? []
      : [
          group('Gates the floor', admitted.rows.filter((row) => row.gatesFloor)),
          group('Moves no number', admitted.rows.filter((row) => !row.gatesFloor)),
        ].filter((g) => g.units > 0),
  );
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if admitted === null}
    <p class="p-1 text-xs text-muted-foreground">
      {view?.kind === 'none'
        ? view.reason
        : 'Press Don’t-know on the dashboard to see what the estate admits it does not know.'}
    </p>
  {:else}
    <InspectionHeader
      title="Don’t-know"
      count={`${admitted.holes} of ${admitted.total}`}
      note={admitted.caption} />

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      {#each groups as group (group.key)}
        <section data-dont-know-group={group.key} class="space-y-3">
          <GroupHeading label={group.label} count={group.units} />
          <QuestionBlockList blocks={group.blocks} onOpen={onOpenQuestion} />
        </section>
      {/each}
    </div>
  {/if}
</div>

<script lang="ts">
  import { evidenceTile } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import InspectionHeader from './inspection-header.svelte';
  import ObjectiveGroups from './objective-groups.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { byObjective, evidenceBlocks } from './question-blocks';

  // ONE Inspector view: every gating answer with no document behind it, read as the
  // questions they answer and grouped by objective. This is what the tile has instead
  // of a maximised state — 62 flat rows are a list, the same rows under their SOV are
  // a reading of where the estate is undefended.
  //
  // `objectiveId` narrows it to the badge that was pressed; null is the whole set.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    objectiveId?: string | null;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, objectiveId = null, onOpenQuestion }: Props = $props();

  const view = $derived(result && workbook ? evidenceTile(result, workbook, parties) : null);
  const covered = $derived(view?.kind === 'covered' ? view : null);
  const objectives = $derived(
    (workbook?.objectives ?? []).filter((o) => objectiveId === null || o.id === objectiveId),
  );
  const groups = $derived(
    covered ? byObjective(objectives, evidenceBlocks(covered.undefended)) : [],
  );
  const listed = $derived(groups.reduce((n, g) => n + g.blocks.length, 0));
  const scope = $derived(
    objectiveId === null
      ? { title: 'Undefended answers', count: `${covered?.undefended.length ?? 0} of ${covered?.total ?? 0}` }
      : {
          // The code the badge wore, so the press and the panel are visibly one thing.
          title: `${objectiveId} · ${groups[0]?.objectiveName ?? ''}`.trim(),
          count: `${listed} undefended`,
        },
  );
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if covered === null}
    <p class="p-1 text-xs text-muted-foreground">
      {view?.kind === 'empty'
        ? view.reason
        : 'Press Evidence on the dashboard to see which gating answers carry no document.'}
    </p>
  {:else}
    <InspectionHeader title={scope.title} count={scope.count} note={covered.caption} />

    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pt-3">
      <!-- Narrowed, the header already names the objective, so its group heading would
           only repeat it. -->
      {#if objectiveId === null}
        <ObjectiveGroups
          {groups}
          onOpen={onOpenQuestion}
          empty="Every gating answer carries a document — nothing to defend." />
      {:else if listed === 0}
        <p class="text-xs text-muted-foreground">
          Every gating answer here carries a document — nothing to defend.
        </p>
      {:else}
        <QuestionBlockList blocks={groups[0]?.blocks ?? []} onOpen={onOpenQuestion} />
      {/if}
    </div>
  {/if}
</div>

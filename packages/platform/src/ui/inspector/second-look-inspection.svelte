<script lang="ts">
  import { secondLookTile, type CheckId } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import CheckFact from './check-fact.svelte';
  import GroupHeading from './group-heading.svelte';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { checkBlocks } from './question-blocks';

  // ONE Inspector view: a single consistency check, read in full. The tile draws five
  // dials and the ratio each one holds; the words — the asserted answer, what the
  // declared model says, and the units to open — are this reading, which is what the
  // tile has instead of a maximised state.
  //
  // Derived live, so a check the estate no longer contradicts resolves away.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    checkId: CheckId;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, checkId, onOpenQuestion }: Props = $props();

  const view = $derived(result && workbook ? secondLookTile(result, workbook, parties) : null);
  const check = $derived(
    view?.kind === 'flagged' ? (view.checks.find((c) => c.id === checkId) ?? null) : null,
  );
  const blocks = $derived(check ? checkBlocks(check.opens) : []);
</script>

<div class="flex h-full min-h-0 flex-col text-sm">
  {#if check === null}
    <p class="p-1 text-xs text-muted-foreground">
      This check reads consistently now. Press another dial on Worth a second look.
    </p>
  {:else}
    <InspectionHeader
      title={check.title}
      count={`${check.ratio.part} of ${check.ratio.whole}`}
      note={check.question} />

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pt-3">
      {#if check.asserted !== null}
        <CheckFact label="The room answered" text={check.asserted} />
      {/if}
      <CheckFact label="The declared model says" text={check.structural} />

      {#if blocks.length > 0}
        <section data-check-opens class="space-y-3">
          <GroupHeading label="Ask about" count={check.opens.length} />
          <QuestionBlockList {blocks} onOpen={onOpenQuestion} />
        </section>
      {:else}
        <p class="text-xs text-muted-foreground">
          No answer to open — this check reads the roster, not a rung.
        </p>
      {/if}
    </div>
  {/if}
</div>

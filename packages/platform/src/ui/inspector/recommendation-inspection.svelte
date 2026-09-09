<script lang="ts">
  import { recommendationsPage } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import FiredLinkChip from '../recommendations-page/fired-link-chip.svelte';
  import InspectionHeader from './inspection-header.svelte';
  import QuestionBlockList from './question-block-list.svelte';
  import { triggerQuestionBlocks } from './question-blocks';

  // ONE Inspector view: why an offer is on the page (recommendations §4.3) — the
  // trigger, any other link that fired, and the answers behind the trigger read as
  // questions. Derived from the live estate, so an offer it no longer fires is gone.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    recommendationId: string;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, recommendationId, onOpenQuestion }: Props = $props();

  const card = $derived.by(() => {
    if (!result || !workbook) return null;
    const page = recommendationsPage(result, workbook, parties);
    return (
      page.chapters
        .flatMap((chapter) => (chapter.band.kind === 'cards' ? chapter.band.cards : []))
        .find((candidate) => candidate.id === recommendationId) ?? null
    );
  });
  const blocks = $derived(card ? triggerQuestionBlocks(card) : []);
  const alsoFired = $derived(
    card
      ? card.fired.filter(
          (f) => f.link.kind !== card.trigger.link.kind || f.link.id !== card.trigger.link.id,
        )
      : [],
  );
</script>

<div class="flex h-full min-h-0 flex-col gap-3 text-sm">
  {#if card === null}
    <p class="p-1 text-xs text-muted-foreground">
      This estate no longer fires that offer. Press another one to see why it is on the page.
    </p>
  {:else}
    <InspectionHeader
      title={card.title}
      count={`${blocks.length} ${blocks.length === 1 ? 'question' : 'questions'}`}
      note="Why you are seeing this." />

    <div class="flex shrink-0 flex-wrap items-center gap-1.5">
      <FiredLinkChip fired={card.trigger} trigger />
      {#each alsoFired as fired (fired.link.kind + fired.link.id)}
        <FiredLinkChip {fired} />
      {/each}
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      {#if blocks.length === 0}
        <p class="text-xs text-muted-foreground">
          The trigger link covers no answered question on this estate.
        </p>
      {:else}
        <QuestionBlockList {blocks} onOpen={onOpenQuestion} />
      {/if}
    </div>
  {/if}
</div>

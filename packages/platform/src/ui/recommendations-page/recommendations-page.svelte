<script lang="ts">
  import { recommendationsPage } from '../../analytics';
  import type { Party, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import HorizonChapter from './horizon-chapter.svelte';
  import RecommenderClosing from './recommender-closing.svelte';
  import RecommenderMasthead from './recommender-masthead.svelte';

  // The recommendations surface (specs/recommendations.md §4): vendor content on
  // its own page, reached from the stage header, so the dashboard beside it stays
  // statistics. It computes its own model, like the instrument wheel.
  let {
    result,
    workbook,
    parties,
  }: {
    result: EngineResult;
    workbook: Workbook;
    parties: Party[];
  } = $props();

  const page = $derived(recommendationsPage(result, workbook, parties));
  /** Each chapter continues the vendor series where the previous one left off. */
  const offsets = $derived(
    page.chapters.map((_, index) =>
      page.chapters
        .slice(0, index)
        .reduce((n, c) => n + (c.band.kind === 'cards' ? c.band.cards.length : 0), 0),
    ),
  );
</script>

<div data-recommendations-page class="mx-auto w-full max-w-5xl space-y-10">
  <RecommenderMasthead reading={page.recommender} />
  {#each page.chapters as chapter, i (chapter.horizon)}
    <HorizonChapter {chapter} accentFrom={offsets[i] ?? 0} />
  {/each}
  <RecommenderClosing reading={page.recommender} />
</div>

<script lang="ts">
  import type { HorizonChapter } from '../../analytics';
  import { RecommendationFeature, vendorAccent } from '../recommendations-page';

  // The offers print as the screen draws them — one rendering of every mark. Two
  // columns where the page has the width, as on the Recommendations page: stacked
  // full-width, this chapter alone ran to seven pages.
  type Props = { chapter: HorizonChapter; ordinalFrom: number };

  let { chapter, ordinalFrom }: Props = $props();
</script>

<section data-report-vendor-chapter={chapter.horizon} class="@container space-y-4">
  <header class="space-y-1 border-b border-border pb-2">
    <h3 class="text-lg font-medium text-foreground">{chapter.title}</h3>
    <p class="text-sm text-muted-foreground">{chapter.when} · {chapter.asks}</p>
  </header>
  {#if chapter.band.kind === 'cards'}
    <div class="grid items-start gap-4 @3xl:grid-cols-2">
      {#each chapter.band.cards as card, i (card.id)}
        <RecommendationFeature
          {card}
          ordinal={ordinalFrom + i + 1}
          accent={vendorAccent(ordinalFrom + i)} />
      {/each}
    </div>
  {:else}
    <p data-report-vendor-empty class="text-sm text-muted-foreground">{chapter.band.reason}</p>
  {/if}
</section>

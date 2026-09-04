<script lang="ts">
  import type { RecommendationCard } from '../../analytics';
  import { vendorAccent } from './accent';
  import RecommendationFeature from './recommendation-feature.svelte';

  // One chapter's offers. Two columns where the band has the width for them (a
  // container query, so a collapsing rail reflows it without a viewport class) and
  // cards read across the row, 01 02 / 03.
  let {
    cards,
    accentFrom,
  }: {
    cards: RecommendationCard[];
    /** Where this band starts in the vendor series, so no two adjacent offers share a hue.*/
    accentFrom: number;
  } = $props();
</script>

<div class="@container">
  <div class="grid gap-5 @3xl:grid-cols-2">
    {#each cards as card, i (card.id)}
      <RecommendationFeature {card} accent={vendorAccent(accentFrom + i)} ordinal={i + 1} />
    {/each}
  </div>
</div>

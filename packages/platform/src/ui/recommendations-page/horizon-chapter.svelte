<script lang="ts">
  import type { HorizonChapter } from '../../analytics';
  import { chipVariants } from '../chip';
  import CardBand from './card-band.svelte';

  // One horizon, read as a chapter: the two bands are two questions asked by two
  // different people (procurement and the CIO), so they never merge into one list.
  let {
    chapter,
    accentFrom,
  }: {
    chapter: HorizonChapter;
    /** Where this chapter starts in the vendor series, so no two adjacent offers
     * wear the same hue across the page.*/
    accentFrom: number;
  } = $props();
</script>

<section data-recommendation-band={chapter.horizon} class="space-y-4">
  <header
    class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-2"
  >
    <div class="flex flex-wrap items-baseline gap-3">
      <h3 class="text-xl text-foreground">{chapter.title}</h3>
      <span class={chipVariants({ tone: 'muted' })}>{chapter.when}</span>
    </div>
    <p class="text-sm text-muted-foreground">{chapter.asks}</p>
  </header>

  {#if chapter.band.kind === 'cards'}
    <CardBand cards={chapter.band.cards} {accentFrom} />
  {:else}
    <p data-recommendation-empty class="text-sm text-muted-foreground">{chapter.band.reason}</p>
  {/if}
</section>

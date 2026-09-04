<script lang="ts">
  import { bodyBlocks, type RecommendationCard } from '../../analytics';
  import type { VendorAccent } from './accent';
  import BodyBlock from './body-block.svelte';
  import TriggerMark from './trigger-mark.svelte';

  // One offer: the pitch, and the trigger that fired it. Why it fired — the other
  // links and the answers behind them — is the Inspector's (recommendations §4.3).
  let {
    card,
    accent,
    ordinal,
  }: {
    card: RecommendationCard;
    accent: VendorAccent;
    ordinal: number;
  } = $props();

  const blocks = $derived(bodyBlocks(card.body));
</script>

<article
  data-recommendation={card.id}
  class="flex h-full flex-col overflow-hidden rounded-xl border border-border {accent.wash}"
>
  <span aria-hidden="true" class="block h-1 {accent.bar}"></span>

  <header class="flex items-baseline gap-3 px-6 pt-6">
    <span class="text-2xl tabular-nums {accent.ink}">{String(ordinal).padStart(2, '0')}</span>
    <span class="text-xl font-medium text-card-foreground">{card.title}</span>
  </header>

  <!-- Grows, so a shorter offer beside a longer one keeps its footer on the floor
     of the card rather than under its last paragraph. -->
  <div class="flex-1 space-y-3 px-6 py-4">
    <p class="max-w-prose text-base text-card-foreground">{card.action}</p>
    {#each blocks as block (block.key)}
      <BodyBlock {block} />
    {/each}
  </div>

  <!-- px-4, not px-6: the mark carries its own px-2 hit padding, so its label lands
     on the same left edge as the header. -->
  <footer class="border-t border-border/50 px-4 py-3">
    <TriggerMark {card} />
  </footer>
</article>

<script lang="ts">
  import type { Recommendation } from '../../schema';
  import X from '@lucide/svelte/icons/x';
  import RecommendationBadges from './recommendation-badges.svelte';

  // ONE recommendation already pointing at the thing being edited: what it is
  // (title, horizon, trigger) and the way OFF this page to author it. The title
  // is the link — an author reading a question's offers needs to reach the offer
  // itself, and a bare string forces them to hunt for it in the catalogue.
  
  // The link is underlined in the ink it is written in, never in `--primary`:
  // under SUSE that token is the brand green, which is the SEAL hue and is
  // barred as body text.
  type Props = {
    recommendation: Recommendation;
    sealName: string;
    /** Open this recommendation's editor. Omitted where there is nowhere to go
     * (the assessment side), and the title then reads as plain text.*/
    onOpen?: ((recommendationId: string) => void) | undefined;
    onUnlink: () => void;
  };
  let { recommendation, sealName, onOpen, onUnlink }: Props = $props();

  const title = $derived(recommendation.title || '(untitled recommendation)');
</script>

<li class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
  {#if onOpen}
    <button
      type="button"
      class="min-w-0 flex-1 truncate rounded pb-0.5 text-left text-xs text-foreground underline decoration-muted-foreground underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onclick={() => onOpen(recommendation.id)}
    >{title}</button>
  {:else}
    <span class="min-w-0 flex-1 truncate text-xs text-foreground">{title}</span>
  {/if}
  <RecommendationBadges {recommendation} {sealName} />
  <button
    type="button"
    class="shrink-0 rounded text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    aria-label={`Unlink ${title}`}
    onclick={onUnlink}
  >
    <X class="size-4" />
  </button>
</li>

<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import type { Landing } from '../../schema';
  import type { Viewer } from '../../merge';
  import { landingCountPhrases, landingSummary, landingTime } from '../../merge';
  import { Card } from '../panel';

  // One Landing in the chronology (landing-history §2.5.1): what was landed, the
  // facilitator's note if there is one, who and when, and the non-zero counts.
  // Data, not judgment — every number arrives from `landingSummary`. The row is
  // one control: the whole entry opens the Landing, where its id is read.
  type Props = { landing: Landing; viewer: Viewer; onOpen: () => void };
  let { landing, viewer, onOpen }: Props = $props();

  const summary = $derived(landingSummary(landing));
  const phrases = $derived(landingCountPhrases(summary));
</script>

<!-- `density="none"`: the row's own `p-1` is the frame around a button that
     fills it, not panel padding. -->
<Card as="li" density="none" class="relative p-1" data-landing-row data-landing-id={landing.id}>
  <span
    aria-hidden="true"
    class="absolute -left-[1.3rem] top-4 hidden size-1.5 rounded-full bg-border md:block"
  ></span>
  <button
    data-landing-open
    class="w-full min-w-0 space-y-0.5 rounded-md p-3 text-left hover:bg-well focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    onclick={onOpen}
  >
    <p class="text-sm font-medium text-foreground break-words" data-landing-title>
      Landed {landing.participant}’s partial
    </p>
    {#if landing.note}
      <p class="text-sm text-muted-foreground break-words" data-landing-note>{landing.note}</p>
    {/if}
    <p class="text-xs text-muted-foreground break-words" data-landing-meta>
      {landing.participant} ·
      <time datetime={landing.at} title={landing.at}>{landingTime(landing, viewer)}</time> ·
      {summary.unitsReviewed} unit{summary.unitsReviewed === 1 ? '' : 's'} reviewed
    </p>
    {#if phrases.length > 0}
      <p class="text-xs text-muted-foreground" data-landing-counts>{phrases.join(' · ')}</p>
    {/if}
    <ChevronRight aria-hidden="true" class="shrink-0 text-muted-foreground" />
  </button>
</Card>

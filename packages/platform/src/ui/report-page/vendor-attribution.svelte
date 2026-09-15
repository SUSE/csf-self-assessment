<script lang="ts">
  import type { NamedRecommender } from '../../report';
  import VendorContact from './vendor-contact.svelte';

  type Props = { recommender: NamedRecommender };

  let { recommender }: Props = $props();
</script>

<div data-report-vendor-attribution class="space-y-3 border-b border-border pb-6">
  <p
    data-report-recommender-name
    class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
  >
    {recommender.name}
  </p>
  <h2 data-report-recommender-headline class="text-2xl font-semibold tracking-tight text-foreground">
    {recommender.headline}
  </h2>
  <p data-report-recommender-disclosure class="max-w-prose text-sm text-muted-foreground">
    {recommender.disclosure}
  </p>
  <p data-report-recommender-reading class="text-sm text-muted-foreground">
    {recommender.reading}
  </p>
  {#if recommender.contact !== null}
    <VendorContact contact={recommender.contact} />
  {/if}
</div>

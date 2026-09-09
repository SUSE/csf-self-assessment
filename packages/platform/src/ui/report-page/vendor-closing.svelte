<script lang="ts">
  import type { NamedRecommender } from '../../report';
  import VendorContact from './vendor-contact.svelte';

  type Props = { recommender: NamedRecommender };

  let { recommender }: Props = $props();
</script>

{#if recommender.contact !== null}
  <section data-report-vendor-closing class="space-y-2 border-t border-border pt-6">
    <p class="text-sm text-foreground">{recommender.headline} · {recommender.reading}</p>
    <VendorContact contact={recommender.contact} />
  </section>
{/if}

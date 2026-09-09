<script lang="ts">
  import type { RecommenderReading } from '../../analytics';
  import VendorStripe from './vendor-stripe.svelte';

  // The page's one repeat of the call to action, at the foot where the reader
  // finishes. The offers themselves carry none: eleven copies of one link is not
  // eleven ways to act.
  let { reading }: { reading: RecommenderReading } = $props();
</script>

{#if reading.kind === 'recommender' && reading.contact !== null}
  <section
    class="overflow-hidden rounded-xl border border-border bg-gradient-to-tr from-vendor-wash-5 via-card to-vendor-wash-3"
  >
    <VendorStripe />
    <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 p-8">
      <p class="min-w-0 flex-1 basis-[20rem]">
        <span class="block text-2xl text-foreground">{reading.headline}</span>
        <span class="block text-sm text-muted-foreground">{reading.reading}</span>
      </p>
      <a
        data-recommender-contact-closing
        href={reading.contact.url}
        target="_blank"
        rel="noreferrer noopener"
        class="inline-flex items-center gap-2 rounded-md border-2 border-vendor-5 px-4 py-2 text-sm font-medium text-vendor-ink-5 hover:bg-vendor-wash-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {reading.contact.label}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  </section>
{/if}

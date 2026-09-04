<script lang="ts">
  import type { RecommenderReading } from '../../analytics';
  import VendorStripe from './vendor-stripe.svelte';

  // Attribution leads the page (specs/recommendations.md §2.4): nothing below can
  // be read without knowing whose offer it is.
  let { reading }: { reading: RecommenderReading } = $props();
</script>

{#if reading.kind === 'recommender'}
  <section
    class="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-vendor-wash-1 via-card to-vendor-wash-4"
  >
    <VendorStripe />
    <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 p-8">
      <div class="min-w-0 flex-1 basis-[26rem] space-y-3">
        <p data-recommender-name class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {reading.name}
        </p>
        <h2 data-recommender-headline class="text-3xl text-foreground">{reading.headline}</h2>
        <p data-recommender-disclosure class="max-w-prose text-sm text-muted-foreground">
          {reading.disclosure}
        </p>
        {#if reading.contact !== null}
          <a
            data-recommender-contact
            href={reading.contact.url}
            target="_blank"
            rel="noreferrer noopener"
            class="inline-flex items-center gap-2 rounded-md border-2 border-vendor-1 px-4 py-2 text-sm font-medium text-vendor-ink-1 hover:bg-vendor-wash-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {reading.contact.label}
            <span aria-hidden="true">→</span>
          </a>
        {/if}
      </div>
      <p data-recommender-reading class="shrink-0 text-right text-sm text-muted-foreground">
        <span class="block text-4xl tabular-nums text-vendor-ink-4">{reading.live}</span>
        {reading.reading}
      </p>
    </div>
  </section>
{:else}
  <p data-recommender-empty class="text-sm text-muted-foreground">{reading.reason}</p>
{/if}

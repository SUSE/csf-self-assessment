<script lang="ts">
  import type { OfferPointers, ReportSection } from '../../report';
  import OfferPointer from './offer-pointer.svelte';
  import ReportReading from './report-reading.svelte';

  // One section of the spine (report.md §4.2). The figures are the dashboard's own
  // — one rendering of every mark (invariant #3) — and this component adds no
  // number.
  type Props = { section: ReportSection; offers: OfferPointers };

  let { section, offers }: Props = $props();
</script>

<section data-report-section={section.id} class="space-y-6">
  <h2 class="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h2>
  {#each section.readings as reading (reading.id)}
    <div class="space-y-2">
      <h3 class="text-lg font-medium text-foreground">{reading.heading}</h3>
      <ReportReading {reading} />
      <OfferPointer ordinals={offers[reading.id] ?? []} />
    </div>
  {/each}
</section>

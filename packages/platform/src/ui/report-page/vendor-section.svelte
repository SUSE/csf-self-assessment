<script lang="ts">
  import type { ReportVendor } from '../../report';
  import VendorAttribution from './vendor-attribution.svelte';
  import VendorChapter from './vendor-chapter.svelte';
  import VendorClosing from './vendor-closing.svelte';

  type Props = { vendor: ReportVendor };

  let { vendor }: Props = $props();
</script>

<section data-report-vendor class="space-y-6">
  <VendorAttribution recommender={vendor.recommender} />
  {#each vendor.chapters as entry (entry.chapter.horizon)}
    <VendorChapter chapter={entry.chapter} ordinalFrom={entry.ordinalFrom} />
  {/each}
  <VendorClosing recommender={vendor.recommender} />
</section>

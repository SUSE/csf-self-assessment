<script lang="ts">
  import type { ReportDocument } from '../../report';
  import AppendixSection from './appendix-section.svelte';
  import ReportCover from './report-cover.svelte';
  import ReportSection from './report-section.svelte';
  import VendorSection from './vendor-section.svelte';

  // The document itself (report.md §4.2) and nothing else: no control belongs
  // inside `[data-report-page]`, because print keeps exactly this subtree.
  let { doc }: { doc: ReportDocument } = $props();
</script>

<article data-report-page class="mx-auto w-full max-w-5xl space-y-10">
  <ReportCover cover={doc.cover} />
  {#each doc.sections as section (section.id)}
    <ReportSection {section} offers={doc.offers} />
  {/each}
  {#if doc.vendor !== null}
    <VendorSection vendor={doc.vendor} />
  {/if}
  <!-- Back matter: how the file was produced, then what it says. -->
  <ReportSection section={doc.provenance} offers={doc.offers} />
  <AppendixSection appendix={doc.appendix} tags={doc.questionTags} />
</article>

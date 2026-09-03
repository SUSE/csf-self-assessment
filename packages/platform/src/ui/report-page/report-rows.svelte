<script lang="ts">
  import { REPORT_ROW_LIMIT, type ReportTag } from '../../report';
  import ReportRow from './report-row.svelte';
  import type { ReportRowModel } from './report-rows';
  import ReportTagBadge from './report-tag.svelte';

  // The rows arrive in the order analytics ranked them — weakest first — so the
  // head is what the page prints and the tail is the appendix's. The tag closes
  // every list, truncated or not, so the badge in the transcript always has a
  // counterpart here to have been searched from.
  let {
    rows,
    tag,
    limit = REPORT_ROW_LIMIT,
  }: { rows: ReportRowModel[]; tag: ReportTag; limit?: number } = $props();

  const shown = $derived(rows.slice(0, limit));
  const rest = $derived(rows.length - shown.length);
</script>

<ul class="mt-2 flex flex-col">
  {#each shown as row (row.key)}
    <ReportRow question={row.question} meta={row.meta} seal={row.seal} flag={row.flag} />
  {/each}
</ul>
{#if rows.length > 0}
  <p data-report-rows-rest class="mt-1 flex items-baseline gap-1.5 text-xs text-muted-foreground">
    {#if rest > 0}<span>…and {rest} more, tagged</span>{:else}<span>Tagged</span>{/if}
    <ReportTagBadge {tag} />
  </p>
{/if}

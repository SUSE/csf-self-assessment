<script lang="ts">
  import type { ConsistencyCheck } from '../../analytics';
  import { reportTag } from '../../report';
  import ReportRows from './report-rows.svelte';
  import type { ReportRowModel } from './report-rows';

  // One check in full: the two facts, the question that reads them together, and the
  // units to open. These are the rail's words — on paper there is no rail to press.
  let { check, index }: { check: ConsistencyCheck; index: number } = $props();

  const rows = $derived<ReportRowModel[]>(
    check.opens.map((open) => ({
      key: open.key,
      question: open.questionText,
      meta: open.label,
      seal: null,
      flag: null,
    })),
  );
</script>

<article data-check={check.id} class="border-t border-border pt-2">
  <h4 class="text-sm font-medium text-card-foreground">{check.title}</h4>
  {#if check.asserted !== null}
    <p class="text-xs text-card-foreground">{check.asserted}</p>
  {/if}
  <p class="text-xs text-muted-foreground">{check.structural}</p>
  <p class="text-xs text-card-foreground">{check.question}</p>
  <ReportRows {rows} tag={reportTag({ kind: 'second-look', index })} />
</article>

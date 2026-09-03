<script lang="ts">
  import { reportDocument, reportFilename } from '../../report';
  import type { ReportStamp } from '../../report';
  import type { Assessment } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import { Button } from '../button';
  import { printReport } from './print-report';
  import ReportDocumentView from './report-document.svelte';

  // The Report as a VISIBLE page: the author's QA preview of the leave-behind their
  // instrument produces. The participant and facilitator apps print it without
  // showing it (report-print.svelte). The actions bar is a SIBLING of the article:
  // print hides everything that is not the document, so a control inside it would
  // print.
  type Props = { assessment: Assessment; result: EngineResult; stamp: ReportStamp };

  let { assessment, result, stamp }: Props = $props();

  const doc = $derived(reportDocument(assessment, result, stamp));
</script>

<div data-report-actions class="mx-auto flex w-full max-w-5xl justify-end">
  <Button onclick={() => printReport(reportFilename(doc.cover))}>Print</Button>
</div>

<ReportDocumentView {doc} />

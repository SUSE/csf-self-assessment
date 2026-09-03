<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { reportDocument, reportFilename } from '../../report';
  import type { ReportStamp } from '../../report';
  import type { Assessment } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import { printReport } from './print-report';
  import ReportDocumentView from './report-document.svelte';

  // The Report as an ACTION: the document mounts off-screen, prints, and unmounts.
  // The renderer is the browser (report.md §3.2), so the DOM still has to exist.
  // Two frames, not one — the figures size themselves from a measured container and
  // the mount frame would print blank.
  type Props = {
    assessment: Assessment;
    result: EngineResult;
    stamp: ReportStamp;
    /** Called once the print dialog has been dismissed — unmount this then.*/
    onDone: () => void;
  };
  let { assessment, result, stamp, onDone }: Props = $props();

  const doc = $derived(reportDocument(assessment, result, stamp));

  onMount(() => {
    let cancelled = false;
    const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
    void (async () => {
      await tick();
      await frame();
      await frame();
      if (cancelled) return;
      printReport(reportFilename(doc.cover));
      onDone();
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div data-report-print aria-hidden="true">
  <ReportDocumentView {doc} />
</div>

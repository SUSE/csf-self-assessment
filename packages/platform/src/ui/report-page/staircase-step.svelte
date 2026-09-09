<script lang="ts">
  import type { StaircaseTile } from '../../analytics';
  import { sealSwatchClass } from '../../utils/seal-color';
  import { reportTag } from '../../report';
  import ReportRows from './report-rows.svelte';
  import type { ReportRowModel } from './report-rows';

  type Step = Extract<StaircaseTile, { kind: 'climb' }>['steps'][number];

  let { step }: { step: Step } = $props();

  const rows = $derived<ReportRowModel[]>(
    step.rows.map((row) => ({
      key: row.key,
      question: row.questionText,
      meta: row.label,
      seal: row.seal,
      flag: row.evidence ? 'evidence recorded' : null,
    })),
  );
</script>

<section data-report-step={step.floor} class="space-y-2">
  <div class="flex items-center gap-2">
    <span class={`rounded-sm px-2 py-1 text-xs font-semibold ${sealSwatchClass(step.floor)}`}>
      {`SEAL-${step.floor}`}
    </span>
    <h4 class="text-sm font-semibold text-card-foreground">{step.floorName}</h4>
  </div>
  <p class="text-sm text-muted-foreground">{step.unlocks}</p>
  <ReportRows {rows} tag={reportTag({ kind: 'staircase', floor: step.floor })} />
</section>

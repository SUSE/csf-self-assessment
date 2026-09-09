<script lang="ts">
  import type { EvidenceTile } from '../../analytics';
  import RatioBar from '../dashboard/ratio-bar.svelte';
  import { reportTag } from '../../report';
  import ReportRows from './report-rows.svelte';
  import type { ReportRowModel } from './report-rows';

  type Props = { model: EvidenceTile };
  let { model }: Props = $props();

  const rows = $derived<ReportRowModel[]>(
    model.kind === 'covered'
      ? model.undefended.map((row) => ({
          key: row.key,
          question: row.questionText,
          meta: row.meta,
          seal: row.seal,
          flag: null,
        }))
      : [],
  );
</script>

{#if model.kind === 'covered'}
  <p data-evidence-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>
  <RatioBar
    fraction={model.barFraction}
    fill={model.floor ?? 'ink'}
    class="w-full"
    data-evidence-bar />
  <ReportRows {rows} tag={reportTag({ kind: 'evidence' })} />
  <p data-evidence-caption class="mt-2 text-xs text-muted-foreground">{model.caption}</p>
{:else}
  <p data-evidence-empty class="text-sm text-muted-foreground">{model.reason}</p>
{/if}

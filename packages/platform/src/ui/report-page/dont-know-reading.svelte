<script lang="ts">
  import type { DontKnowTile } from '../../analytics';
  import { reportTag } from '../../report';
  import ReportRows from './report-rows.svelte';
  import type { ReportRowModel } from './report-rows';

  type Props = { model: DontKnowTile };
  let { model }: Props = $props();

  const rows = $derived<ReportRowModel[]>(
    model.kind === 'admitted'
      ? model.rows.map((row) => ({
          key: row.key,
          question: row.questionText,
          meta: `${row.label} · ${row.roleName}`,
          seal: null,
          flag: row.gatesFloor ? 'gates the floor' : null,
        }))
      : [],
  );
</script>

{#if model.kind === 'admitted'}
  <p data-dont-know-headline class="text-lg font-semibold text-card-foreground">{model.headline}</p>
  <ReportRows {rows} tag={reportTag({ kind: 'dont-know' })} />
  <p data-dont-know-caption class="mt-2 text-xs text-muted-foreground">{model.caption}</p>
{:else}
  <p data-dont-know-empty class="text-sm text-muted-foreground">{model.reason}</p>
{/if}

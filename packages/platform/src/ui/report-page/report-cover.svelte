<script lang="ts">
  import type { ReportCover } from '../../report';
  import CompletenessRibbon from '../dashboard/completeness-ribbon.svelte';
  import { Logo } from '../logo';

  // Page one (report.md §2.2.1): what this is, what it was read against, and the
  // two marks a forwarded copy cannot lose — the ribbon and the not-a-certification
  // line (invariant #1), so neither is ever conditional.
  type Props = { cover: ReportCover };

  let { cover }: Props = $props();

  const contributors = $derived(
    `${cover.contributors} ${cover.contributors === 1 ? 'contributor' : 'contributors'}`,
  );
</script>

<header data-report-cover class="space-y-4">
  <Logo />
  <h1 class="text-4xl font-semibold tracking-tight text-foreground">{cover.estateName}</h1>
  <p class="text-sm text-muted-foreground">
    {cover.workbookTitle} · {cover.workbookVersion}
  </p>
  <p class="text-sm text-muted-foreground">Generated {cover.generatedLabel}</p>
  <p class="text-sm text-muted-foreground">{contributors}</p>
  <CompletenessRibbon model={cover.ribbon} />
  <p data-report-not-certification class="text-sm text-foreground">
    {cover.notACertification}
  </p>
</header>

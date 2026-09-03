<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../utils/cn';
  import { Panel, PanelHeader } from '../panel';

  // A titled "details" card — the labelled-metadata block shared by both apps'
  // overviews (the author's editable workbook meta, the assessment's read-only
  // workbook + workbook-assessment context). `fields` lay out in a wrapping row.
  // `footer` renders beneath them (e.g. an issue list). Presentation only — the
  // caller owns each field's content via DetailField.
  let {
    title,
    fields,
    footer,
    class: className,
  }: {
    title: string;
    fields: Snippet;
    footer?: Snippet;
    class?: string;
  } = $props();
</script>

<Panel class={cn('space-y-3', className)}>
  <PanelHeader {title} tone="eyebrow" level={2} />
  <!-- A wrapping field row: `basis`/`grow` on each DetailField decide who takes
     the slack, so the row reflows on the width it actually has. The column gap
     is wider than the row gap because a wrapped field must read as a new line,
     not as a fourth column. -->
  <div class="flex flex-wrap items-start gap-x-5 gap-y-3">{@render fields()}</div>
  {@render footer?.()}
</Panel>

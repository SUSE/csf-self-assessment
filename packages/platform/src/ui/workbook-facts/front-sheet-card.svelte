<script lang="ts">
  import { FrontSheet } from '../front-sheet';
  import { Panel, PanelHeader } from '../panel';

  // The workbook's front sheet as a reader sees it — the opening page, in a titled
  // panel. A workbook with no front sheet SAYS so: an empty panel reads as a
  // rendering failure, and "carries no front sheet" is a real fact about it.
  type Props = {
    lines: string[];
    title?: string;
  };
  let { lines, title = 'Front sheet' }: Props = $props();
</script>

<Panel class="space-y-3">
  <PanelHeader {title} tone="eyebrow" level={2} />
  {#if lines.length === 0}
    <p class="text-xs text-muted-foreground">This workbook carries no front sheet.</p>
  {:else}
    <FrontSheet {lines} />
  {/if}
</Panel>

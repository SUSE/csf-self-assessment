<script lang="ts">
  import { Panel } from '../panel';
  // The workbook's front sheet (spec §9 S11, audit R-7): the instrument's
  // opening declarations — expected ceiling, don't-know semantics, pre-work —
  // shown before any answering starts. Content is workbook data; this
  // component only displays it. Renders nothing when there are no lines.
  let { lines }: { lines: string[] } = $props();
</script>

{#if lines.length > 0}
  <!-- `tone="quiet"`: present but not the subject, and laid straight on the
       canvas — where a card-derived Well would have no parent to step away from. -->
  <Panel as="aside" tone="quiet" aria-label="Front sheet" class="space-y-2">
    {#each lines as line, i (i)}
      <p class="text-sm text-muted-foreground">{line}</p>
    {/each}
  </Panel>
{/if}

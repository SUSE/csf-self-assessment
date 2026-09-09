<script lang="ts">
  // The heading over one group of question blocks in the rail: what it is, how many.
  // `code` is an authored id worn before the label, monospaced — `SOV-2`.
  let {
    label,
    count,
    code,
  }: { label: string; count: number; code?: string | undefined } = $props();
</script>

<h4
  class="flex items-baseline gap-1.5 border-b border-border pb-1 text-xs font-semibold text-muted-foreground">
  {#if code}
    <span class="shrink-0 font-mono">{code}</span>
  {/if}
  <span class="min-w-0 flex-1 truncate">{label}</span>
  <span class="shrink-0 font-normal tabular-nums">{count}</span>
</h4>

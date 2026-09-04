<script lang="ts">
  // The head of an inspection: what is selected, how much of it there is, and one
  // line saying what the list below is. Shared so every view in the rail opens the
  // same way.
  type Props = {
    title: string;
    /** The count chip's text — `9 of 57`, `2 answers`. Omit for no chip.*/
    count?: string | undefined;
    note: string;
  };
  let { title, count, note }: Props = $props();
</script>

<div class="shrink-0 border-b border-border pb-2">
  <div class="flex items-baseline justify-between gap-2">
    <h3 data-inspection-title class="min-w-0 truncate font-semibold text-foreground">{title}</h3>
    {#if count}
      <span
        class="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground"
        >{count}</span>
    {/if}
  </div>
  <p data-inspection-note class="text-xs text-muted-foreground">{note}</p>
</div>

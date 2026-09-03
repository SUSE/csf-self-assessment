<script lang="ts">
  import { cn } from '../../utils/cn';
  import { provenanceLensClass } from '../../utils/provenance-lens';
  import type { Provenance } from '../../utils/provenance-lens';

  // A reading aid over the marks that carry a gesture (analytics §4.6): how each
  // answer was placed. It is description, never judgment (product invariant #4) —
  // the engine reads a swept answer and an individual one identically, so this
  // moves no number. The host decides where it sits; it renders beside the tiles
  // that answer to it, never over the whole grid.
  let {
    tint,
    onToggle,
    class: className,
  }: { tint: boolean; onToggle: () => void; class?: string | undefined } = $props();

  const READINGS: readonly { provenance: Provenance; label: string }[] = [
    { provenance: 'individual', label: 'Individually placed' },
    { provenance: 'mixed', label: 'Mixed gestures' },
    { provenance: 'group', label: 'Swept by one group gesture' },
  ];
</script>

<div class={cn('flex flex-wrap items-center gap-3', className)}>
  <button
    type="button"
    data-provenance-toggle
    aria-pressed={tint}
    onclick={onToggle}
    class={`rounded border px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-foreground ${tint ? 'border-foreground bg-muted text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
    Provenance tint
  </button>
  {#if tint}
    <ul data-provenance-legend class="flex flex-wrap items-center gap-3">
      {#each READINGS as reading (reading.provenance)}
        <li class="flex items-center gap-1 text-xs text-muted-foreground">
          <span class={`inline-block size-3 rounded-sm ${provenanceLensClass(reading.provenance)}`}
          ></span>
          {reading.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

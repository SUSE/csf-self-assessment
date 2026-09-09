<script lang="ts">
  import type { EvidenceObjective } from '../../../../analytics';
  import ObjectiveBadge from './objective-badge.svelte';

  // Where the debt sits. The counts are questions, and the line above says so — the
  // headline above THAT counts answers.
  
  // Read in objective order, not weight order: the chips are a strip of instrument
  // ids, and a strip that reorders itself as answers land is harder to scan than one
  // that always sits where the instrument puts it. The count is on each chip.
  let {
    objectives,
    label,
    pressable,
  }: { objectives: EvidenceObjective[]; label: string; pressable: boolean } = $props();

  const ordered = $derived(
    [...objectives].sort((a, b) =>
      a.objectiveId.localeCompare(b.objectiveId, undefined, { numeric: true }),
    ),
  );
</script>

<div class="flex items-baseline justify-between gap-3">
  <p class="text-xs font-semibold text-muted-foreground">Undefended, by objective</p>
  <p data-evidence-undefended class="text-xs tabular-nums text-muted-foreground">
    {pressable ? `${label} · press one for its list` : label}
  </p>
</div>
<ul class="mt-1.5 flex flex-wrap gap-1.5">
  {#each ordered as objective (objective.objectiveId)}
    <li><ObjectiveBadge {objective} /></li>
  {/each}
</ul>

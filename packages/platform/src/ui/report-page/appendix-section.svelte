<script lang="ts">
  import type { AppendixObjective, ReportTag } from '../../report';
  import AppendixObjectiveView from './appendix-objective.svelte';

  type Props = {
    appendix: AppendixObjective[];
    tags: Readonly<Record<string, ReportTag[]>>;
  };

  let { appendix, tags }: Props = $props();
</script>

<section data-report-appendix class="space-y-6">
  <h2 class="text-2xl font-semibold tracking-tight text-foreground">
    Appendix — the answer record
  </h2>
  <p class="text-sm text-muted-foreground">
    Every unit of this instrument for this estate, as it was answered: its target, what was said,
    the gesture that placed it, and the note recorded with it.
  </p>
  <p class="text-sm text-muted-foreground">
    A question the analysis listed carries that list's tag. Search this document for the tag —
    <span class="font-mono">#EVID</span>, <span class="font-mono">#CLIMB-2</span> — to find every
    question behind a reading that printed only its worst few.
  </p>
  {#if appendix.length === 0}
    <p class="text-sm text-muted-foreground">
      This instrument produced no answer units for this estate — there is nothing to record.
    </p>
  {:else}
    {#each appendix as objective (objective.id)}
      <AppendixObjectiveView {objective} {tags} />
    {/each}
  {/if}
</section>

<script lang="ts">
  import type { EvidenceObjective } from '../../../../analytics';
  import { Chip } from '../../../chip';
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';

  // One objective's evidence debt: the authored code, then how many of its questions
  // owe a document. Inspector-aware — pressing it puts that objective's undefended
  // questions in the rail. With no session it is a plain mark, not a dead control.
  
  // The count wears `--primary` — the palette's own accent, a fill and never text.
  // It is a quantity, not a rung and not an alarm, so it takes neither the SEAL ramp
  // nor the amber.
  let { objective }: { objective: EvidenceObjective } = $props();

  const inspector = getInspector();
  const selection: InspectSelection = $derived({
    kind: 'evidence',
    objectiveId: objective.objectiveId,
  });
  const showing = $derived(inspector?.isShowing(selection) ?? false);
  const attrs = $derived(
    inspector
      ? {
          as: 'button',
          type: 'button' as const,
          'aria-pressed': showing,
          onclick: () => inspector.show(selection),
        }
      : {},
  );
</script>

<Chip
  tone="mono"
  {...attrs}
  class={`gap-1.5 py-1 pr-1 pl-2 font-mono ${inspector ? 'cursor-pointer' : ''} ${
    showing ? 'ring-1 ring-foreground/60' : ''
  }`}
  data-evidence-objective={objective.objectiveId}
  title={`${objective.objectiveName} — ${objective.questions} undefended`}>
  <span aria-hidden="true">{objective.objectiveId}</span>
  <span class="sr-only">{objective.objectiveName},</span>
  <span
    class="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-semibold text-primary-foreground">
    {objective.questions}
  </span>
  <span class="sr-only">undefended</span>
</Chip>

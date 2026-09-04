<script lang="ts">
  import type { Objective } from '../../schema';
  import { cn } from '../../utils/cn';
  import { getInspector } from '../inspector/inspector.svelte';
  import type { InspectSelection } from '../inspector/subject';
  import { Inset } from '../panel';
  import MetricCell from './metric-cell.svelte';

  type Props = {
    objective: Objective;
    /** Column maxima, so every row's bars are drawn against the same scale.*/
    maxQuestions: number;
    maxWeight: number;
  };
  let { objective, maxQuestions, maxWeight }: Props = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({ kind: 'objective', objectiveId: objective.id });
  const showing = $derived(inspector?.isShowing(selection) ?? false);
  const count = $derived(objective.questions.length);
  const interactive = $derived(
    inspector
      ? {
          type: 'button' as const,
          'aria-pressed': showing,
          title: `Inspect ${objective.name || objective.id}`,
          onclick: () => inspector.show(selection),
        }
      : {},
  );
</script>

<Inset as="li" density="none" class="overflow-hidden p-0">
  <svelte:element
    this={inspector ? 'button' : 'div'}
    {...interactive}
    class={cn(
      'flex w-full items-center gap-2 px-2 py-1.5 text-left',
      inspector &&
        'cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
      showing && 'bg-accent text-accent-foreground',
    )}
  >
    <span class="font-mono text-xs text-muted-foreground">{objective.id}</span>
    <span class="min-w-0 flex-1 truncate text-sm text-foreground"
      >{objective.name || '(unnamed objective)'}</span
    >
    <MetricCell value={count} fraction={count / maxQuestions} unit="questions" />
    <MetricCell value={objective.weight} fraction={objective.weight / maxWeight} unit="weight" />
  </svelte:element>
</Inset>

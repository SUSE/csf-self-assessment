<script lang="ts">
  import type { Objective } from '../../schema';
  import { cn } from '../../utils/cn';

  // An objective heading a group of its own questions: the code, then the name. Not
  // a PanelHeader — that one's title is a single string, and here the code is a
  // distinct token in front of the name, on the same baseline.
  
  // The name takes the LABEL role, not body size: its members are `text-sm`
  // questions, and at body size the heading read as one more row. The Earned Size
  // Rule forbids buying rank with size, so rank comes from case and tracking.
  type Props = {
    objective: Objective;
    level?: 2 | 3;
  };
  let { objective, level = 2 }: Props = $props();
</script>

<div class="flex items-baseline gap-2">
  <span class="font-mono text-xs tabular-nums text-muted-foreground">{objective.id}</span>
  <svelte:element
    this={`h${level}`}
    class={cn(
      'text-xs font-semibold uppercase tracking-wide',
      objective.name ? 'text-foreground' : 'italic text-muted-foreground',
    )}>{objective.name || '(unnamed objective)'}</svelte:element
  >
</div>

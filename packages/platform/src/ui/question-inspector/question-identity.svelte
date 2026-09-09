<script lang="ts">
  import type { Question, Workbook } from '../../schema';
  import { gates } from '../../score-engine';
  import { questionGrainLabel } from './model';

  // The question's identity line: the answering role (name + its id token), the
  // materiality when it is anything but the default, and the grain — how the
  // question fans into answers. Read-only vocabulary the facilitator needs to place
  // what they are looking at.
  type Props = { workbook: Workbook; question: Question };
  let { workbook, question }: Props = $props();

  const roleName = $derived(
    workbook.roles.find((r) => r.id === question.role)?.name ?? question.role,
  );
</script>

<div class="space-y-2">
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
    <span class="rounded bg-accent px-1.5 py-0.5 text-xs text-foreground">{roleName}</span>
    <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-3xs uppercase tracking-wide text-muted-foreground" title="Answering role">{question.role}</span>
    {#if !gates(question.defaultMateriality)}
      <span class="rounded border border-border px-1.5 py-0.5 text-3xs italic text-muted-foreground">
        {question.defaultMateriality}
      </span>
    {/if}
  </div>
  <p class="text-xs text-muted-foreground">{questionGrainLabel(question)}</p>
</div>

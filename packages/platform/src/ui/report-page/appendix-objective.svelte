<script lang="ts">
  import type { AppendixObjective, ReportTag } from '../../report';
  import AppendixQuestion from './appendix-question.svelte';

  type Props = { objective: AppendixObjective; tags: Readonly<Record<string, ReportTag[]>> };

  let { objective, tags }: Props = $props();
</script>

<section data-appendix-objective={objective.id} class="space-y-2">
  <h3 class="text-lg font-medium text-foreground">{objective.name}</h3>
  <table class="w-full text-left text-sm">
    <thead class="text-muted-foreground">
      <tr>
        <th scope="col" class="py-1 font-medium">Target</th>
        <th scope="col" class="py-1 font-medium">Answer</th>
        <th scope="col" class="py-1 font-medium">Gesture</th>
        <th scope="col" class="py-1 font-medium">Note</th>
      </tr>
    </thead>
    {#each objective.questions as question (question.questionId)}
      <AppendixQuestion {question} tags={tags[question.questionId] ?? []} />
    {/each}
  </table>
</section>

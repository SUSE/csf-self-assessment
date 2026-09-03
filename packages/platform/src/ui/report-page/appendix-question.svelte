<script lang="ts">
  import type { AppendixQuestion, ReportTag } from '../../report';
  import AppendixUnit from './appendix-unit.svelte';
  import ReportTagBadge from './report-tag.svelte';

  // The badges are the other half of the printed cross-reference: a reader who
  // searches for the token in a truncated list lands on this row.
  type Props = { question: AppendixQuestion; tags: ReportTag[] };

  let { question, tags }: Props = $props();
</script>

<tbody data-appendix-question={question.questionId} class="text-card-foreground">
  <tr>
    <th colspan="4" scope="colgroup" class="border-t border-border py-2 text-left font-medium">
      {question.questionText}
      <span class="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-xs font-normal text-muted-foreground">
        <span>{question.roleName} · {question.materiality}</span>
        {#each tags as tag (tag.key)}
          <ReportTagBadge {tag} />
        {/each}
      </span>
    </th>
  </tr>
  {#each question.rows as row, i (i)}
    <AppendixUnit {row} />
  {/each}
</tbody>

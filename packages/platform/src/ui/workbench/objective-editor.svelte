<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Objective, Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { removeObjective, updateObjective } from '../../author';
  import { Panel } from '../panel';
  import { ConfirmDelete } from '../confirm-delete';
  import { RecommendationLinksRow } from '../recommendations-editor';
  import { Input, IssueList, Textarea } from '../forms';

  // The workbench's single-objective focus: identity, weight, the objective's
  // question list, and the recommendations linked to it. It holds NO edit logic
  // and NO validation — pure ops build the next draft, and the strict issues
  // arrive pre-computed from the stage. Identity fields commit on change. the
  // name streams on input.
  type Props = {
    draft: Workbook;
    objective: Objective;
    /** The full strict-issue list — the editor scopes it by its own index.*/
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
    /** Open one of this objective's questions in the QuestionEditor.*/
    onOpenQuestion: (id: string) => void;
    onOpenRecommendation: (id: string) => void;
  };
  let { draft, objective, issues, onDraft, onOpenQuestion, onOpenRecommendation }: Props = $props();

  const oi = $derived(draft.objectives.findIndex((o) => o.id === objective.id));
  // The objective's own issues, minus anything owned by a question below it.
  const ownIssues = $derived(
    issuesUnder(issues, ['objectives', oi]).filter((i) => i.path.length <= 3),
  );
</script>

<Panel class="space-y-3">
  <div class="flex flex-wrap items-center gap-2">
    <Input
      density="compact"
      class="w-24 font-mono text-xs"
      aria-label={`Objective id ${objective.id}`}
      value={objective.id}
      onchange={(e) => onDraft(updateObjective(draft, objective.id, { id: e.currentTarget.value }))}
    />
    <Input
      density="compact"
      class="w-auto grow text-sm font-semibold"
      aria-label={`Objective name ${objective.id}`}
      value={objective.name}
      oninput={(e) => onDraft(updateObjective(draft, objective.id, { name: e.currentTarget.value }))}
    />
    <label class="text-xs text-muted-foreground">
      weight
      <Input
        density="compact"
        class="w-16 text-xs"
        type="number"
        step="1"
        value={String(objective.weight)}
        onchange={(e) => onDraft(updateObjective(draft, objective.id, { weight: Math.trunc(Number(e.currentTarget.value) || 0) }))}
      />
    </label>
    <ConfirmDelete label="objective" onconfirm={() => onDraft(removeObjective(draft, objective.id))} />
  </div>
  <Textarea
    rows={2}
    placeholder="What this objective covers — optional"
    aria-label={`Objective description ${objective.id}`}
    value={objective.description ?? ''}
    oninput={(e) => onDraft(updateObjective(draft, objective.id, { description: e.currentTarget.value }))}
  />
  <IssueList issues={ownIssues} />

  <div class="space-y-1">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</h3>
    {#if objective.questions.length === 0}
      <p class="text-xs text-muted-foreground">No questions yet — add one from the header.</p>
    {:else}
      <ul class="space-y-1">
        {#each objective.questions as question, qi (question.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md bg-well px-2 py-1.5 text-left hover:ring-1 hover:ring-foreground/30"
              onclick={() => onOpenQuestion(question.id)}
            >
              <span class="font-mono text-xs text-muted-foreground">{qi + 1}</span>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">
                {question.text || '(untitled question)'}
              </span>
              <span class="shrink-0 rounded bg-accent px-1.5 py-0.5 font-mono text-3xs text-muted-foreground" title="Answering role">{question.role}</span>
              {#if issuesUnder(issues, ['objectives', oi, 'questions', qi]).length > 0}
                <span class="size-2 shrink-0 rounded-full bg-destructive"></span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <RecommendationLinksRow
    {draft}
    target={{ kind: 'objective', id: objective.id }}
    {onDraft}
    onOpen={onOpenRecommendation}
  />
</Panel>

<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Workbook } from '../../schema';
  import { issuesUnder } from '../../schema';
  import { addObjective, removeObjective } from '../../author';
  import { Button } from '../button';
  import { Panel, PanelHeader, Well } from '../panel';
  import { ConfirmDelete } from '../confirm-delete';

  // The workbench's Objectives focus: the list page for the sovereignty
  // objectives (SOV) the instrument scores. It holds NO edit logic and NO
  // validation — pure ops build the next draft, and the strict issues arrive
  // pre-computed from the stage. A row only flags that it HAS issues. the
  // messages themselves belong to the ObjectiveEditor the row opens.
  
  // The ROW is the control, as it is in every other list that opens an editor
  // (the objective's own question list, the recommendation catalogue). A row
  // that opens on click does not also need an edit button on its right: two
  // affordances for one action, one of them a 32px target inside a 900px one.
  // Delete stays outside that control, so a mis-aimed click on the row can
  // never remove anything.
  type Props = {
    draft: Workbook;
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
    /** Edit one objective — the stage swaps to the ObjectiveEditor.*/
    onOpen: (id: string) => void;
  };
  let { draft, issues, onDraft, onOpen }: Props = $props();
</script>

<Panel class="space-y-3">
  <div class="space-y-1">
    <PanelHeader title="Objectives" tone="eyebrow" level={2}>
      {#snippet actions()}<Button variant="outline" onclick={() => onDraft(addObjective(draft))}>+ Objective</Button>{/snippet}
    </PanelHeader>
    <p class="max-w-prose text-xs text-muted-foreground">
      The sovereignty objectives (SOV) the instrument scores. Open one to set
      its id, name, weight, and questions.
    </p>
  </div>
  {#if draft.objectives.length === 0}
    <Well tone="empty" density="sm">
      <p class="text-xs text-muted-foreground">No objectives yet — add one to begin.</p>
    </Well>
  {:else}
    <ul class="divide-y divide-border/60 border-y border-border/60">
      {#each draft.objectives as o, oi (o.id)}
        {@const flagged = issuesUnder(issues, ['objectives', oi]).length > 0}
        <li class="flex items-center gap-2">
          <!-- Quiet at rest, filled on hover and focus — a fill rather than a
     ring, so nothing reflows by a pixel. -->
          <button
            type="button"
            class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-2 py-1.5 text-left hover:bg-well focus-visible:bg-well"
            onclick={() => onOpen(o.id)}
          >
            <span class="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 grow truncate text-sm text-foreground">{o.name || '(unnamed objective)'}</span>
            <span class="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">weight {o.weight}</span>
            <span
              class="size-2 shrink-0 rounded-full {flagged ? 'bg-destructive' : 'bg-transparent'}"
              aria-label={flagged ? 'Has an issue' : undefined}
            ></span>
          </button>
          <ConfirmDelete label="objective" onconfirm={() => onDraft(removeObjective(draft, o.id))} />
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

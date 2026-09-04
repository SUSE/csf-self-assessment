<script lang="ts">
  import type { Question, Workbook } from '../../schema';
  import { MaterialitySchema } from '../../schema';
  import { removeQuestion, setAxis, setGrain, updateQuestion } from '../../author';
  import { Button } from '../button';
  import { ConfirmDelete } from '../confirm-delete';
  import { Input, Select } from '../forms';
  import { eyebrowVariants } from '../panel';
  import * as ToggleGroup from '../toggle-group';
  import Eye from '@lucide/svelte/icons/eye';
  import SquarePen from '@lucide/svelte/icons/square-pen';

  // The question's identity line: the editable twin of the fill card's "answering
  // as <role> · asked once for the whole assessment" strip (ui/question-header).
  // Same facts, same place on the card, made editable — the flip changes the
  // affordances, not the layout.
  
  // It renders in BOTH faces (inside the editor Panel while authoring, on the
  // canvas above the real participant card while previewing), which is why it is a
  // component rather than markup in the editor: one strip, wired twice.
  
  // Four concerns in three labelled groups, parted by two hairlines: identity (the
  // id), structure (grain, and the axis that only party grain has), attribution
  // (who answers it, and whether it scores). Before this they were an
  // undifferentiated run of five controls at one gap — which is what made the two
  // segmented toggles read as four loose words.
  type Props = {
    draft: Workbook;
    question: Question;
    /** The card is currently showing the participant's fill face.*/
    previewing: boolean;
    /** The question parses on its own, so the flip can render real fill components.*/
    previewable: boolean;
    onFlip: () => void;
    onDraft: (next: Workbook) => void;
  };
  let { draft, question, previewing, previewable, onFlip, onDraft }: Props = $props();

  // Union narrowing via $derived (design rule 7): the axis exists on party grain.
  const partyQ = $derived(question.grain === 'party' ? question : null);

  // A group's caption, in the label register — the one thing that turns a run of
  // controls into named groups.
  const CAPTION = eyebrowVariants({ weight: 'medium' });
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
  <Input
    density="compact"
    class="w-56 font-mono text-xs"
    aria-label="Question id"
    data-rule="3.5"
    value={question.id}
    onchange={(e) => onDraft(updateQuestion(draft, question.id, { id: e.currentTarget.value }))}
  />

  <span aria-hidden="true" class="h-4 w-px shrink-0 bg-border"></span>

  <span class={CAPTION}>grain</span>
  <!-- Fully controlled via the function binding ui/toggle-group documents: the
     getter stays the source of truth, and the empty string bits-ui emits when
     the lit item is re-pressed is dropped, so a grain is never unset. -->
  <ToggleGroup.Root
    aria-label="Grain"
    data-rule="grain"
    bind:value={
      () => question.grain,
      (v) => {
        if (v === 'party' || v === 'dimension') onDraft(setGrain(draft, question.id, v));
      }
    }
  >
    <ToggleGroup.Item value="party">party</ToggleGroup.Item>
    <ToggleGroup.Item value="dimension">dimension</ToggleGroup.Item>
  </ToggleGroup.Root>
  {#if partyQ}
    <ToggleGroup.Root
      aria-label="Axis"
      data-rule="axis"
      bind:value={
        () => partyQ.axis,
        (v) => {
          if (v === 'assessment' || v === 'party') onDraft(setAxis(draft, question.id, v));
        }
      }
    >
      <ToggleGroup.Item value="assessment">asked once</ToggleGroup.Item>
      <ToggleGroup.Item value="party">per party</ToggleGroup.Item>
    </ToggleGroup.Root>
  {/if}

  <span aria-hidden="true" class="h-4 w-px shrink-0 bg-border"></span>

  <label class="flex items-center gap-1.5" data-rule="role">
    <span class={CAPTION}>answering</span>
    <Select
      density="compact"
      class="w-auto text-xs"
      value={question.role}
      onchange={(e) => onDraft(updateQuestion(draft, question.id, { role: e.currentTarget.value }))}
    >
      {#each draft.roles as r (r.id)}<option value={r.id} title={r.description ?? ''}
          >{r.id} — {r.name}</option
        >{/each}
    </Select>
  </label>
  <label class="flex items-center gap-1.5" data-rule="3.4">
    <span class={CAPTION}>materiality</span>
    <Select
      density="compact"
      class="w-auto text-xs"
      value={question.defaultMateriality}
      onchange={(e) =>
        onDraft(
          updateQuestion(draft, question.id, {
            defaultMateriality: MaterialitySchema.parse(e.currentTarget.value),
          }),
        )}
    >
      {#each MaterialitySchema.options as m (m)}<option value={m}>{m}</option>{/each}
    </Select>
  </label>

  <span class="ml-auto flex shrink-0 items-center gap-2">
    <Button
      variant="outline"
      size="icon"
      disabled={!previewable}
      aria-label={previewing ? 'Edit' : 'Preview'}
      title={previewable
        ? 'Flip the card between edit and fill'
        : 'Fix this question’s issues to preview it'}
      onclick={onFlip}
    >{#if previewing}<SquarePen class="size-4" />{:else}<Eye class="size-4" />{/if}</Button>
    <ConfirmDelete label="question" onconfirm={() => onDraft(removeQuestion(draft, question.id))} />
  </span>
</div>

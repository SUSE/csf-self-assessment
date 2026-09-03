<script lang="ts">
  import type { ZodIssue } from 'zod';
  import type { Recommendation, Workbook } from '../../schema';
  import { HorizonSchema, SealSchema } from '../../schema';
  import {
    removeRecommendation,
    setRecommendationBody,
    updateRecommendation,
  } from '../../author';
  import { Button } from '../button';
  import { ConfirmDelete } from '../confirm-delete';
  import { Field, Input, IssueList, Select, Textarea } from '../forms';
  import { Panel, PanelHeader, Well } from '../panel';
  import * as ToggleGroup from '../toggle-group';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import RecommendationLinksEditor from './recommendation-links-editor.svelte';

  // ONE recommendation, on its own page — reached from the catalogue list and
  // left by the Back control at its head. Holds no edit logic: every control
  // calls a pure op and emits the whole next workbook.
  //
  // The page is three things: WHAT this offer is (identity and the conditions
  // that fire it, in one recessed strip), WHAT IT SAYS (the action line and the
  // body), and WHAT IT POINTS AT.
  //
  // The last two sit SIDE BY SIDE once the panel is wide enough, which is what
  // keeps a wide screen from being mostly canvas. Bounding the page instead left
  // a third of the stage empty; capping the prose alone left a narrow field in a
  // wide row. Two real columns spend the width on content, and the body stays at
  // a writable measure because the links column is taking the rest of it.
  //
  // The split is a CONTAINER query, not a viewport one: this panel loses ~18rem
  // whenever the right rail opens, so the only width that can decide the layout
  // is its own.
  type Props = {
    draft: Workbook;
    recommendation: Recommendation;
    /** Already scoped to this recommendation by the caller. */
    issues: ZodIssue[];
    onDraft: (next: Workbook) => void;
    /** Back to the catalogue. Deleting from here goes back too — the page it
     *  would return to no longer exists. */
    onBack: () => void;
  };
  let { draft, recommendation, issues, onDraft, onBack }: Props = $props();

  function remove(): void {
    onDraft(removeRecommendation(draft, recommendation.id));
    onBack();
  }

  function chooseHorizon(value: string): void {
    const horizon = HorizonSchema.options.find((h) => h === value);
    if (horizon) onDraft(updateRecommendation(draft, recommendation.id, { horizon }));
  }
</script>

<div class="space-y-2">
  <Button variant="ghost" size="sm" onclick={onBack}>
    <ArrowLeft data-icon="inline-start" class="size-4" />
    All recommendations
  </Button>

  <Panel class="space-y-6">
    <PanelHeader
      title={recommendation.title || '(untitled recommendation)'}
      tone="eyebrow"
      level={2}
    >
      {#snippet actions()}
        <ConfirmDelete label="recommendation" onconfirm={remove} />
      {/snippet}
    </PanelHeader>

    <!-- Identity, then the firing conditions as ONE group that wraps together:
         horizon, trigger and order answer a single question — when does this
         appear — and splitting them across a wrap boundary reads as five
         unrelated settings. -->
    <Well density="sm" class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <Field label="title" class="min-w-0 grow-[2] basis-72">
        <Input
          class="font-semibold"
          density="compact"
          data-rule="3.8"
          value={recommendation.title}
          oninput={(e) =>
            onDraft(updateRecommendation(draft, recommendation.id, { title: e.currentTarget.value }))}
        />
      </Field>
      <!-- The id grows too, at half the title's rate: these slugs run past 30
           characters, and a fixed column truncated every one of them. -->
      <Field label="id" class="min-w-0 grow basis-56">
        <Input
          class="font-mono"
          density="compact"
          data-rule="3.8"
          value={recommendation.id}
          onchange={(e) =>
            onDraft(updateRecommendation(draft, recommendation.id, { id: e.currentTarget.value }))}
        />
      </Field>

      <div class="flex flex-wrap items-end gap-3">
        <!-- `as="div"`: an implicit label around a toggle group would name only
             its first option, so the group carries its own aria-label. -->
        <Field label="horizon" as="div" data-rule="horizon">
          <ToggleGroup.Root
            aria-label="Horizon"
            bind:value={() => recommendation.horizon, (v) => chooseHorizon(v)}
          >
            {#each HorizonSchema.options as h (h)}
              <ToggleGroup.Item value={h}>{h}</ToggleGroup.Item>
            {/each}
          </ToggleGroup.Root>
        </Field>
        <Field label="fires at or below" data-rule="recommendation-link">
          <Select
            density="compact"
            value={recommendation.whenAtOrBelow}
            onchange={(e) =>
              onDraft(
                updateRecommendation(draft, recommendation.id, {
                  whenAtOrBelow: SealSchema.parse(Number(e.currentTarget.value)),
                }),
              )}
          >
            {#each draft.sealLevels as level (level.seal)}
              <option value={level.seal}>SEAL-{level.seal} · {level.name}</option>
            {/each}
          </Select>
        </Field>
        <Field label="order" class="w-16">
          <Input
            density="compact"
            type="number"
            step="1"
            value={String(recommendation.order)}
            onchange={(e) =>
              onDraft(
                updateRecommendation(draft, recommendation.id, {
                  order: Math.max(0, Math.trunc(Number(e.currentTarget.value) || 0)),
                }),
              )}
          />
        </Field>
      </div>
    </Well>

    <!-- The `@container` sits on the WRAPPER, never on the flex row itself: a
         container query matches descendants, so an element carrying both the
         container and the variant can never satisfy its own condition. -->
    <div class="@container/rec">
      <div class="flex flex-col gap-6 @4xl/rec:flex-row @4xl/rec:items-start">
        <div class="min-w-0 space-y-3 @4xl/rec:flex-[1.4]">
          <!-- A textarea, not an input: this runs to two or three sentences in the
               real catalogue, and a single-line box showed the author the first
               half of the line they are writing. It stays a ONE-LINE value: any
               newline the writer types collapses to a space on the way to the op,
               so pressing Enter extends the sentence instead of splitting it. -->
          <Field label="action">
            <Textarea
              density="compact"
              rows={3}
              data-rule="3.8"
              placeholder="The one line on the card face"
              value={recommendation.action}
              oninput={(e) =>
                onDraft(
                  updateRecommendation(draft, recommendation.id, {
                    action: e.currentTarget.value.replace(/\n/g, ' '),
                  }),
                )}
            />
          </Field>

          <Field label="body">
            <Textarea
              density="compact"
              rows={12}
              data-rule="3.8"
              placeholder="One line per paragraph. A line starting “- ” renders as a bullet."
              value={recommendation.body.join('\n')}
              onchange={(e) =>
                onDraft(
                  setRecommendationBody(
                    draft,
                    recommendation.id,
                    e.currentTarget.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter((l) => l.length > 0),
                  ),
                )}
            />
          </Field>
        </div>

        <div class="min-w-0 @4xl/rec:flex-1">
          <RecommendationLinksEditor {draft} {recommendation} {onDraft} />
        </div>
      </div>
    </div>

    <IssueList {issues} />
  </Panel>
</div>

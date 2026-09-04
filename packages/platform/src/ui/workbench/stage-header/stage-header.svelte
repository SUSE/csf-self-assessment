<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ZodIssue } from 'zod';
  import type { Objective, Workbook } from '../../../schema';
  import { addQuestion } from '../../../author';
  import * as Tooltip from '../../tooltip';
  import { QuestionNav, type NavGroup } from '../../question-nav';
  import { HelpToggle } from '../../rulebook';
  import ListTodo from '@lucide/svelte/icons/list-todo';
  import Plus from '@lucide/svelte/icons/plus';
  import { focusForIssue, type FocusRef } from '../focus';
  import SectionNav from './section-nav.svelte';
  import HeaderIconButton from './header-icon-button.svelte';

  // The stage header: the sole navigation for
  // the single-focus stage. Composes the instrument SectionNav and the shared
  // QuestionNav — the same breadcrumb + full-map dialog the assessment app uses,
  // green-free (green-reserved) and driven by authoring issues rather than
  // coverage: a question with a strict-validation issue reads as a red `flag`
  // tick, so the map doubles as the issue overview. +Question rides the nav's
  // trailing slot. Owns only what its units share: the current objective and
  // issue ownership.
  type Props = {
    draft: Workbook;
    focus: FocusRef;
    issues: ZodIssue[];
    onFocus: (focus: FocusRef) => void;
    onDraft: (next: Workbook) => void;
    /** The app's stage destinations, closing the row past their own divider —
     * the facilitator toolbar's reporting group in the same place.*/
    destinations?: Snippet | undefined;
  };
  let { draft, focus, issues, onFocus, onDraft, destinations }: Props = $props();

  // The objective the crumb is scoped to: the one owning the focused question, or
  // the focused objective, else the first — instrument-section focuses default to
  // the first objective so the crumb is never blank.
  const currentObjective = $derived.by((): Objective | undefined => {
    if (focus.kind === 'question') {
      return (
        draft.objectives.find((o) => o.questions.some((q) => q.id === focus.id)) ??
        draft.objectives[0]
      );
    }
    if (focus.kind === 'objective') {
      return draft.objectives.find((o) => o.id === focus.id) ?? draft.objectives[0];
    }
    return draft.objectives[0];
  });

  // Does any issue land on this target? Reuses focusForIssue so the red flag ticks
  // and the issue-jump agree by construction.
  function ownsIssue(match: (f: FocusRef) => boolean): boolean {
    return issues.some((i) => match(focusForIssue(draft, i)));
  }

  // The whole workbook as the navigator's model — every objective × question,
  // each question flagged red iff it owns a strict-validation issue. Authoring is
  // estate-wide, so this is not claim-scoped.
  const groups = $derived<NavGroup[]>(
    draft.objectives.map((o) => ({
      id: o.id,
      code: o.id,
      name: o.name,
      questions: o.questions.map((q) => ({
        id: q.id,
        text: q.text,
        tone: ownsIssue((f) => f.kind === 'question' && f.id === q.id) ? 'flag' : 'none',
        fraction: 0,
      })),
    })),
  );

  const activeId = $derived(
    focus.kind === 'question' ? focus.id : (currentObjective?.questions[0]?.id ?? ''),
  );

  // +Question appends a draft-blank question to the current objective and focuses
  // it (moved here from the retired QuestionStrip).
  function addQuestionAndFocus(): void {
    const o = currentObjective;
    if (!o) return;
    const next = addQuestion(draft, o.id, 'party');
    const objNext = next.objectives.find((x) => x.id === o.id);
    const created = objNext?.questions[objNext.questions.length - 1];
    onDraft(next);
    if (created) onFocus({ kind: 'question', id: created.id });
  }
</script>

<Tooltip.Provider delayDuration={300}>
  <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-1">
    <!-- Help closes the section row rather than leading it: it is a mode, not a
     destination, so it sits past the last divider beside Test estates — the
     other control that is about the workbench rather than in it. -->
    <SectionNav {focus} {ownsIssue} {onFocus}>
      {#snippet actions()}
        <HelpToggle />
      {/snippet}
    </SectionNav>

    <div class="h-6 w-px bg-border"></div>

    <QuestionNav {groups} {activeId} onSelect={(id) => onFocus({ kind: 'question', id })}>
      <!-- The Questions index OPENS the group it belongs to: every question the
     workbook asks, in reading order, as the page behind the nav that walks
     them one at a time. It leads the nav rather than joining the instrument
     section tabs, which reach the workbook's OTHER sets. It also carries the
     dot for any question-level issue — the page that reaches the target. -->
      {#snippet lead()}
        <HeaderIconButton
          label="Questions"
          Icon={ListTodo}
          rule="question"
          active={focus.kind === 'questions'}
          flagged={ownsIssue((f) => f.kind === 'question')}
          onclick={() => onFocus({ kind: 'questions' })}
        />
      {/snippet}
      {#snippet actions()}
        <HeaderIconButton label="Add question" Icon={Plus} onclick={addQuestionAndFocus} />
      {/snippet}
    </QuestionNav>

    {#if destinations}
      {@render destinations()}
    {/if}
  </div>
</Tooltip.Provider>

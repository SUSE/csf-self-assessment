<script lang="ts">
  import type { Snippet } from 'svelte';
  import InspectorHint from './inspector-hint.svelte';
  import type { InspectSelection, InspectSubject, InspectorViews } from './subject';

  // The right rail, whole. One component decides what the panel shows, from one
  // rule: what a component SELECTED, else what the screen says this page reads.
  // Everything else about the rail — which child, with which data — is the app's
  // registry (see InspectorViews), so a new inspectable surface costs a subject
  // kind and a view, not an `{#if}` in an App shell.
  type Props = {
    /** The live session's selection (`inspector.selection`). */
    selection: InspectSelection | null;
    /** What this page reads when nothing is selected — an estate reading, or the
     *  line naming what to click. Re-declared by the screen every render. */
    page?: InspectSubject | null;
    views: InspectorViews;
    /** Last resort: nothing selected, no page subject, or a kind this app has no
     *  view for. */
    hint?: string | undefined;
  };
  let { selection, page = null, views, hint }: Props = $props();

  // The precedence rule, written once: a selection always outranks the page's own
  // reading, because the reader just asked for it.
  const subject = $derived<InspectSubject | null>(selection ?? page);

  // The dispatch. One cast, confined here: snippet parameters are contravariant, so
  // a `Snippet<[QuestionSelection]>` is not assignable to `Snippet<[InspectSubject]>`
  // even though the lookup can only ever hand it its own kind. The app side stays
  // fully typed by InspectorViews.
  const view = $derived<Snippet<[InspectSubject]> | undefined>(
    subject === null ? undefined : (views[subject.kind] as Snippet<[InspectSubject]> | undefined),
  );
</script>

{#if subject !== null && subject.kind === 'hint'}
  <InspectorHint text={subject.text} />
{:else if subject !== null && view}
  {@render view(subject)}
{:else if hint}
  <InspectorHint text={hint} />
{/if}

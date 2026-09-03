<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
  import * as Popover from '../popover';
  import type { NavGroup, NavQuestion } from './types';
  import NavTick from './nav-tick.svelte';
  import NavKey from './nav-key.svelte';
  import NavMap from './nav-map.svelte';

  // The shared question navigator (docs/question-redesign addendum 3, option B):
  // ONE control replacing the objective dropdown + horizontal-scroll strip both
  // apps carried. A compact breadcrumb (`SOV-3 Data & AI · Q5/9`) with Prev/Next
  // that opens a full-map popover of every objective × question. Model-driven and
  // domain-agnostic — the caller maps its own per-question status into NavGroup[]
  // (assessment: coverage; author: authoring issues → `flag`). Owns no answer/
  // draft state; every move is emitted through `onSelect`.
  type Props = {
    groups: NavGroup[];
    activeId: string;
    onSelect: (id: string) => void;
    /** Assessment passes true → the `done` tick is green; author leaves it green-free. */
    useGreen?: boolean;
    /** Coverage summary e.g. `12/28 answered`; presence also turns on the map's
        per-objective counts. Author omits it (no coverage). */
    summary?: string;
    /** Offer the "next unanswered" jump (assessment); author leaves it off. */
    showNextUnresolved?: boolean;
    /** Leading app-specific controls, before Prev — the author's Questions index,
        say. Its twin at the other end is `actions`; a control that is ABOUT the
        set of questions belongs in this group rather than among the instrument
        section tabs, which are about the workbook's other sets. */
    lead?: Snippet | undefined;
    /** Trailing app-specific controls — the author's +Question, say. */
    actions?: Snippet;
  };
  let {
    groups,
    activeId,
    onSelect,
    useGreen = false,
    summary,
    showNextUnresolved = false,
    lead,
    actions,
  }: Props = $props();

  type Flat = { q: NavQuestion; group: NavGroup; indexInGroup: number };
  const flat = $derived<Flat[]>(
    groups.flatMap((g) => g.questions.map((q, i) => ({ q, group: g, indexInGroup: i }))),
  );
  // The active row, defaulting to the first question when `activeId` is stale or
  // points outside these groups (a linear order never leaves the crumb blank).
  const activeIdx = $derived(Math.max(0, flat.findIndex((f) => f.q.id === activeId)));
  const active = $derived<Flat | undefined>(flat[activeIdx]);

  const canPrev = $derived(activeIdx > 0);
  const canNext = $derived(activeIdx < flat.length - 1);
  function step(delta: number): void {
    const t = flat[activeIdx + delta];
    if (t) onSelect(t.q.id);
  }

  // First not-started / in-progress question after the active one, wrapping to the
  // top — the answer to "what did I skip", which nothing offered before.
  const isOpen = (f: Flat): boolean => f.q.tone === 'none' || f.q.tone === 'partial';
  const nextUnresolvedIdx = $derived.by(() => {
    const after = flat.findIndex((f, i) => i > activeIdx && isOpen(f));
    return after >= 0 ? after : flat.findIndex(isOpen);
  });
  const hasUnresolved = $derived(nextUnresolvedIdx >= 0);
  function goUnresolved(): void {
    const t = flat[nextUnresolvedIdx];
    if (t) onSelect(t.q.id);
  }

  // The map's counts are coverage-progress, so they ride with `summary`.
  const showCounts = $derived(summary !== undefined);

  let open = $state(false);
  function pick(id: string): void {
    open = false;
    onSelect(id);
  }

  const controlFocus =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:!outline-foreground';
  const stepBtn = `inline-grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 ${controlFocus}`;
</script>

{#if active || lead || actions}
  <div class="flex flex-wrap items-center gap-2">
    {#if lead}{@render lead()}{/if}

    {#if active}
      <button
        type="button"
        aria-label="Previous question"
        class={stepBtn}
        disabled={!canPrev}
        onclick={() => step(-1)}
      >
        <ChevronLeft class="size-5" />
      </button>

      <Popover.Root bind:open>
        <Popover.Trigger
          class="inline-flex h-9 min-w-0 max-w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:!outline-foreground"
        >
          <span class="shrink-0 font-mono text-2xs font-semibold tracking-wide text-muted-foreground">
            {active.group.code}
          </span>
          <span class="max-w-[min(16rem,40vw)] truncate font-medium" title={active.group.name}>
            {active.group.name}
          </span>
          <span class="shrink-0 font-mono text-2xs text-muted-foreground">
            Q{active.indexInGroup + 1}/{active.group.questions.length}
          </span>
          <NavTick
            tone={active.q.tone}
            fraction={active.q.fraction}
            notch={active.q.notch ?? false}
            naMark={active.q.naMark ?? false}
            {useGreen}
            size="mini"
            label={String(active.indexInGroup + 1)}
          />
          <ChevronDown class="size-4 shrink-0 text-muted-foreground" />
        </Popover.Trigger>
        <Popover.Content
          class="w-[min(46rem,calc(100vw-2rem))] overflow-hidden p-0"
          aria-label="Jump to a question"
        >
          <div class="border-b border-border bg-muted/30 px-4 py-3">
            <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span class="text-base font-semibold">Jump to a question</span>
              {#if summary}
                <span class="ml-auto font-mono text-xs text-muted-foreground">{summary}</span>
              {/if}
            </div>
            <NavKey {groups} {useGreen} />
          </div>
          <div class="p-2 sm:p-3">
            <NavMap {groups} {activeId} {useGreen} {showCounts} onSelect={pick} />
          </div>
        </Popover.Content>
      </Popover.Root>

      <button
        type="button"
        aria-label="Next question"
        class={stepBtn}
        disabled={!canNext}
        onclick={() => step(1)}
      >
        <ChevronRight class="size-5" />
      </button>

      {#if summary}
        <span
          class="inline-flex h-9 items-center rounded-md border border-border/70 bg-muted/30 px-2.5 font-mono text-xs text-muted-foreground"
        >
          {summary}
        </span>
      {/if}

      {#if showNextUnresolved}
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:!outline-foreground"
          disabled={!hasUnresolved}
          onclick={goUnresolved}
        >
          <ChevronsRight class="size-4" /> Next unanswered
        </button>
      {/if}
    {/if}

    {#if actions}{@render actions()}{/if}
  </div>
{/if}

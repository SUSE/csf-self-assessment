<script lang="ts">
  import { cn } from '../../utils/cn';
  import type { NavGroup } from './types';
  import { NAV_TONE_LABEL } from './variants';
  import NavTick from './nav-tick.svelte';

  // The popover body: the whole claim (or workbook) as objective rows × question
  // ticks — full names, no scroll window. One row per group: code + name, the
  // ticks, and an optional answered/total count (omitted where coverage is
  // meaningless, e.g. the author's issue view).
  type Props = {
    groups: NavGroup[];
    activeId: string;
    useGreen?: boolean;
    /** Show the per-objective answered/total count (assessment yes, author no). */
    showCounts?: boolean;
    /** Navigate to a question — the owner also closes the popover. */
    onSelect: (id: string) => void;
  };
  let { groups, activeId, useGreen = false, showCounts = true, onSelect }: Props = $props();

  function stats(g: NavGroup): { done: number; total: number } {
    const inScope = g.questions.filter((q) => q.tone !== 'na');
    return { done: inScope.filter((q) => q.tone === 'done').length, total: inScope.length };
  }
</script>

<div class="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
  {#each groups as g (g.id)}
    {@const st = stats(g)}
    {@const activeHere = g.questions.some((q) => q.id === activeId)}
    <div
      class={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-md border-l-2 px-3 py-2.5 sm:grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)_auto] sm:gap-x-4',
        activeHere ? 'border-foreground bg-muted/50' : 'border-transparent',
      )}
    >
      <span class="min-w-0 sm:col-start-1 sm:row-start-1">
        <span class="block font-mono text-2xs font-semibold tracking-wide text-muted-foreground">
          {g.code}
        </span>
        <span class="block truncate text-sm font-medium" title={g.name}>{g.name}</span>
      </span>
      <div
        class="col-span-2 flex min-w-0 flex-wrap gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-1"
      >
        {#each g.questions as q, qi (q.id)}
          <NavTick
            tone={q.tone}
            fraction={q.fraction}
            notch={q.notch ?? false}
            naMark={q.naMark ?? false}
            {useGreen}
            active={q.id === activeId}
            label={String(qi + 1)}
            title={q.text}
            ariaLabel={`${g.code} Q${qi + 1} — ${NAV_TONE_LABEL[q.tone]}${
              q.notch ? ', holds a don’t-know' : ''
            }${q.naMark ? ', holds a doesn’t-apply' : ''}`}
            onclick={() => onSelect(q.id)}
          />
        {/each}
      </div>
      {#if showCounts}
        <span
          class="col-start-2 row-start-1 whitespace-nowrap font-mono text-xs text-muted-foreground sm:col-start-3"
        >
          {st.done}/{st.total}
        </span>
      {/if}
    </div>
  {/each}
</div>

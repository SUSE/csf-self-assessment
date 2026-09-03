<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { cn } from '../../utils/cn';
  import { Inset } from '../panel';
  import FacetChip from './facet-chip.svelte';
  import QuestionUnitRow from './question-unit-row.svelte';
  import type { QuestionUnitView } from './question-blocks';

  // ONE question as every rail reads it — the answers behind a heat mark, the backlog on
  // an owner, the questions on a wheel chip. The question leads and is the deep-link,
  // facts its units share are chips beside it, and what differs is a row. The block is
  // one recessed Inset tile, so question boundaries are a tonal step, not a divider.
  type Props = {
    questionId: string;
    text: string;
    chips?: string[];
    /** [] where the rail lists questions rather than their units. */
    units?: QuestionUnitView[];
    onOpen?: ((id: string) => void) | undefined;
  };
  let { questionId, text, chips = [], units = [], onOpen }: Props = $props();

  const open = $derived(
    onOpen ? { type: 'button' as const, onclick: () => onOpen(questionId) } : {},
  );

  // A single unit with nothing left to name rides the identity line: a row holding only
  // a badge says less than the chips above it already did.
  const solo = $derived(units.length === 1 && units[0]!.facet === '' && Boolean(units[0]!.reading));
</script>

<Inset as="section" density="none" data-question-block={questionId} class="space-y-1.5 p-1.5">
  <svelte:element
    this={onOpen ? 'button' : 'div'}
    {...open}
    title={onOpen ? `Open ${questionId}` : text}
    class={cn(
      'group flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-0.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      onOpen && 'hover:bg-accent/60',
    )}
  >
    <span
      class={cn(
        'min-w-0 flex-1 text-pretty text-xs font-semibold leading-snug text-foreground',
        !text && 'font-normal italic text-muted-foreground',
      )}>{text || '(untitled question)'}</span>
    {#if onOpen}
      <ArrowUpRight
        class="mt-0.5 size-3 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
    {/if}
  </svelte:element>

  {#if chips.length > 0 || solo}
    <div class="flex flex-wrap items-center gap-1.5 px-2">
      {#if solo}
        <QuestionUnitRow facet="" reading={units[0]!.reading ?? null} inline />
      {/if}
      {#each chips as chip (chip)}
        <FacetChip>{chip}</FacetChip>
      {/each}
    </div>
  {/if}

  {#if !solo && units.length > 0}
    <ul class="space-y-0.5">
      {#each units as unit, i (`${unit.facet}|${i}`)}
        <QuestionUnitRow facet={unit.facet} reading={unit.reading ?? null} />
      {/each}
    </ul>
  {/if}
</Inset>

<script lang="ts">
  import type { QueueFacets, QueueFilter } from '../../merge';
  import { NO_FILTER, filterSummary, isQueueNarrowed, optionName, toggleSwitch } from '../../merge';
  import { Button } from '../button';
  import { FilterOption, FilterRow } from '../filter-bar';
  import * as ToggleGroup from '../toggle-group';
  import FilterSwitch from './filter-switch.svelte';

  // The queue's narrowing controls (merge.md §4.4). Four labelled rows, every
  // option carrying the count it would leave, and one sentence underneath saying
  // the whole narrowing in words — a filter nobody can read is a filter nobody
  // uses, and the earlier bar was an unlabelled strip of jargon.
  //
  // `Show: Open / Decided` is the review's progress readout as well as a filter:
  // it is the ONE control that says how much is left, which is why it leads. It
  // hides decided clashes; it never decides one.
  //
  // There is deliberately NO bulk control (invariant #7). Every clash needs a
  // human review, and a suggestion sits on nearly every divergence, so a button
  // that applied suggestions to a narrowed set was the rubber stamp its own
  // constraint existed to prevent. Decisions are made on the cards.
  //
  // The bar computes nothing: every label, count and sentence arrives from
  // `merge/queue.ts` (invariant #13).
  type Props = {
    filter: QueueFilter;
    facets: QueueFacets;
    onFilter: (filter: QueueFilter) => void;
  };
  let { filter, facets, onFilter }: Props = $props();

  // Each chooser resolves the pressed value against the facets themselves, so an
  // option can only ever be one the core offered.
  function chooseStatus(value: string): void {
    const status = facets.statuses.find((option) => option.value === value)?.value;
    if (status !== undefined) onFilter({ ...filter, status });
  }
  function chooseClass(value: string): void {
    const clashClass = facets.classes.find((option) => option.value === value)?.value;
    if (clashClass !== undefined) onFilter({ ...filter, clashClass });
  }
  function chooseParticipant(value: string): void {
    const option = facets.participants.find((entry) => (entry.value ?? '') === value);
    if (option !== undefined) onFilter({ ...filter, participant: option.value });
  }
</script>

<div class="space-y-2" data-queue-filters>
  <FilterRow label="Show">
    <ToggleGroup.Root
      aria-label="Decision state"
      bind:value={() => filter.status, (v) => chooseStatus(v)}
    >
      {#each facets.statuses as option (option.value)}
        <FilterOption
          value={option.value}
          label={option.label}
          count={option.count}
          selected={filter.status === option.value}
          name={optionName(option.label, option.count)}
        />
      {/each}
    </ToggleGroup.Root>
  </FilterRow>

  <FilterRow label="Class">
    <ToggleGroup.Root
      aria-label="Clash class"
      bind:value={() => filter.clashClass, (v) => chooseClass(v)}
    >
      {#each facets.classes as option (option.value)}
        <FilterOption
          value={option.value}
          label={option.label}
          count={option.count}
          selected={filter.clashClass === option.value}
          name={optionName(option.label, option.count)}
        />
      {/each}
    </ToggleGroup.Root>
  </FilterRow>

  <FilterRow label="Answered by">
    <ToggleGroup.Root
      aria-label="Participant"
      bind:value={() => filter.participant ?? '', (v) => chooseParticipant(v)}
    >
      {#each facets.participants as option (option.value ?? '')}
        <FilterOption
          value={option.value ?? ''}
          label={option.label}
          count={option.count}
          selected={filter.participant === option.value}
          name={optionName(option.label, option.count)}
        />
      {/each}
    </ToggleGroup.Root>
  </FilterRow>

  <!-- The switches sit in the same bordered strip the option groups use, because
       they narrow in exactly the same way — they are independent (a group of
       toggle buttons, not a radiogroup), which is the only difference. -->
  <FilterRow label="Only">
    <div
      class="inline-flex flex-wrap rounded-md border border-border p-0.5"
      role="group"
      aria-label="Extra narrowing"
    >
      {#each facets.switches as option (option.value)}
        <FilterSwitch
          label={option.label}
          count={option.count}
          on={option.on}
          onToggle={() => onFilter(toggleSwitch(filter, option.value))}
        />
      {/each}
    </div>
  </FilterRow>

  <div class="flex flex-wrap items-center gap-2 border-t border-border pt-2">
    <p class="text-xs text-muted-foreground" data-queue-count>
      {filterSummary(filter, facets.shown, facets.total)}
    </p>
    {#if isQueueNarrowed(filter)}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Clear filters"
        onclick={() => onFilter(NO_FILTER)}
      >
        Clear filters
      </Button>
    {/if}
  </div>
</div>

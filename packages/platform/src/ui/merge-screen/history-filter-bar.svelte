<script lang="ts">
  import type { DateFilter, HistoryFilters, OutcomeFilter } from '../../merge';
  import { NO_HISTORY_FILTERS, OUTCOME_FILTERS, isNarrowed } from '../../merge';
  import { Button } from '../button';
  import { Input } from '../forms';
  import * as ToggleGroup from '../toggle-group';

  // The History list's narrowing controls (landing-history §4.3). The bar computes
  // nothing: every label comes from the core, every count arrives as a prop.
  type Props = {
    filters: HistoryFilters;
    participants: string[];
    shown: number;
    total: number;
    onFilters: (filters: HistoryFilters) => void;
    /** Enter in the search box — the owner resolves an exact id entry. */
    onSubmit: () => void;
  };
  let { filters, participants, shown, total, onFilters, onSubmit }: Props = $props();

  const DATE_KINDS: { value: DateFilter['kind']; label: string }[] = [
    { value: 'all-time', label: 'All time' },
    { value: 'range', label: 'Date range' },
  ];

  function chooseParticipant(value: string): void {
    if (value === '') {
      onFilters({ ...filters, participant: null });
    } else if (participants.includes(value)) {
      onFilters({ ...filters, participant: value });
    }
  }

  function chooseDates(value: string): void {
    if (value === 'all-time') {
      onFilters({ ...filters, dates: { kind: 'all-time' } });
    } else if (value === 'range') {
      onFilters({ ...filters, dates: { kind: 'range', from: null, to: null } });
    }
  }

  function chooseOutcome(value: string): void {
    const outcome: OutcomeFilter | undefined = OUTCOME_FILTERS.find(
      (entry) => entry.value === value,
    )?.value;
    if (outcome !== undefined) onFilters({ ...filters, outcome });
  }

  const edge = (value: string): string | null => (value === '' ? null : value);

  function setRange(from: string | null, to: string | null): void {
    onFilters({ ...filters, dates: { kind: 'range', from, to } });
  }

  const range = $derived(filters.dates.kind === 'range' ? filters.dates : null);
</script>

<div class="flex flex-wrap items-center gap-3" data-history-filters>
  <Input
    density="compact"
    data-history-search
    aria-label="Search history"
    placeholder="Search history…"
    value={filters.search}
    oninput={(e) => onFilters({ ...filters, search: e.currentTarget.value })}
    onkeydown={(e) => {
      if (e.key === 'Enter') onSubmit();
    }}
  />

  <ToggleGroup.Root
    aria-label="Participant"
    bind:value={() => filters.participant ?? '', (v) => chooseParticipant(v)}
  >
    <ToggleGroup.Item value="">All participants</ToggleGroup.Item>
    {#each participants as participant (participant)}
      <ToggleGroup.Item value={participant}>{participant}</ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>

  <ToggleGroup.Root
    aria-label="Date range"
    bind:value={() => filters.dates.kind, (v) => chooseDates(v)}
  >
    {#each DATE_KINDS as entry (entry.value)}
      <ToggleGroup.Item value={entry.value}>{entry.label}</ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>

  {#if range !== null}
    <Input
      type="date"
      density="compact"
      data-history-from
      aria-label="From date"
      value={range.from ?? ''}
      oninput={(e) => setRange(edge(e.currentTarget.value), range.to)}
    />
    <Input
      type="date"
      density="compact"
      data-history-to
      aria-label="To date"
      value={range.to ?? ''}
      oninput={(e) => setRange(range.from, edge(e.currentTarget.value))}
    />
    <Button variant="ghost" size="sm" aria-label="Clear dates" onclick={() => setRange(null, null)}>
      Clear dates
    </Button>
  {/if}

  <ToggleGroup.Root aria-label="Outcome" bind:value={() => filters.outcome, (v) => chooseOutcome(v)}>
    {#each OUTCOME_FILTERS as entry (entry.value)}
      <ToggleGroup.Item value={entry.value}>{entry.label}</ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>

  <p class="text-xs text-muted-foreground" data-history-count>
    {shown} of {total} landing{total === 1 ? '' : 's'}
  </p>

  {#if isNarrowed(filters)}
    <Button
      variant="ghost"
      size="sm"
      aria-label="Clear filters"
      onclick={() => onFilters(NO_HISTORY_FILTERS)}
    >
      Clear filters
    </Button>
  {/if}
</div>

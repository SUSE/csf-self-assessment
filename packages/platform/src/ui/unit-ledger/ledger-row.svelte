<script lang="ts">
  import type { Question } from '../../schema';
  import type { LedgerEntry } from '../../merge';
  import { cn } from '../../utils/cn';
  import OutcomeMark from './outcome-mark.svelte';

  // One ledger record (merge.md §2.4.4) as THREE fields rather than one run-on
  // sentence: what stands, who landed it and when, then the claims behind it.
  // Data, not judgment — `current` is only recency, the record that stands now;
  // superseded ones step back to muted so the answer reads before its history.
  type Props = { entry: LedgerEntry; question: Pick<Question, 'ladder'>; current?: boolean };
  let { entry, question, current = false }: Props = $props();

  // The raw ISO stamp is 24 characters of which about eight are read, and it was the
  // longest token in a 20rem rail. Compact for reading, exact in `datetime`/`title`.
  const when = $derived(new Date(entry.landing.at));
  const stamp = $derived(
    Number.isNaN(when.getTime())
      ? entry.landing.at
      : when.toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
  );
</script>

<li class="flex gap-2.5">
  <OutcomeMark answer={entry.record.after} {question} {current} />
  <div class="min-w-0 flex-1 space-y-1 pt-0.5">
    <p class={cn('text-xs leading-5', current ? 'text-foreground' : 'text-muted-foreground')}>
      {entry.sentence}
    </p>
    <p class="text-xs leading-5 text-muted-foreground">
      {entry.landing.participant} ·
      <time datetime={entry.landing.at} title={entry.landing.at} class="tabular-nums">{stamp}</time>
    </p>
    {#if entry.sources.length > 0}
      <!-- Ruled aside: the claims are the evidence FOR the line above, not a third
           peer field. Same idiom as a question's `why`. -->
      <p
        class="border-l border-border pl-2 text-xs leading-5 text-muted-foreground"
        data-ledger-sources
      >
        {entry.sources.join(' · ')}
      </p>
    {/if}
  </div>
</li>

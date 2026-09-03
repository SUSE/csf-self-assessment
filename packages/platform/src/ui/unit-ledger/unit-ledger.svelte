<script lang="ts">
  import type { Question } from '../../schema';
  import type { LedgerEntry } from '../../merge';
  import LedgerRow from './ledger-row.svelte';
  import { Well, eyebrowVariants } from '../panel';
  import { cn } from '../../utils/cn';

  // One answer unit's history in ledger order — `git blame` for an answer.
  //
  // The rail is drawn ONCE at list level, not per row, so it spans the gaps between
  // entries the way the ladder's staircase does — the opaque outcome chips interrupt
  // it, which is what makes the column read as a tape. 12px between entries against
  // 4px between an entry's own fields stops consecutive records reading as one
  // paragraph.
  type Props = { label: string; entries: LedgerEntry[]; question: Pick<Question, 'ladder'> };
  let { label, entries, question }: Props = $props();
</script>

<Well as="section" density="none" class="space-y-2 px-3 py-2.5" aria-label="Unit history">
  <h4 class={cn(eyebrowVariants(), 'text-foreground')}>{label}</h4>
  <div class="relative">
    <span class="absolute bottom-3 left-[11.5px] top-3 w-px bg-border" aria-hidden="true"></span>
    <ol class="space-y-3">
      {#each entries as entry, i (i)}
        <LedgerRow {entry} {question} current={i === entries.length - 1} />
      {/each}
    </ol>
  </div>
</Well>

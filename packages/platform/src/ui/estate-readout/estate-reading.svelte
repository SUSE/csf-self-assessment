<script lang="ts">
  import type { TestEstateReading } from '../../author';
  import { SealBadge } from '../seal-badge';

  // One test estate's live reading: its floor, its score, how much of it is
  // answered, and what pins the floor. The floor is a SealBadge rather than the
  // string "SEAL-0" — the same chip the answer ladder shows for that rung, so the
  // ramp carries the rank and a SEAL-0 needs no extra red.
  type Props = {
    reading: TestEstateReading;
  };
  let { reading }: Props = $props();

  const dealt = $derived(reading.units.total - reading.units.unanswered);
  const score = $derived(
    reading.overall.score === null ? '—' : reading.overall.score.toFixed(2),
  );
</script>

<li
  data-estate-reading={reading.estateId}
  class="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-2"
>
  <SealBadge seal={reading.overall.floor} />
  <span class="min-w-0 grow truncate text-sm text-foreground">{reading.name}</span>
  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">score {score}</span>
  <span class="shrink-0 text-xs tabular-nums text-muted-foreground"
    >{dealt}/{reading.units.total} units</span>
  {#if reading.overall.binding.length > 0}
    <!-- What the floor is bound by is the reading's reason, so it takes its own
         line rather than being pushed past the counts — but ONE line: eleven
         question ids wrapped to two rows and outweighed the reading itself. The
         count leads, the whole set rides the tooltip. -->
    <span
      class="min-w-0 basis-full truncate text-2xs text-muted-foreground"
      title={reading.overall.binding.join(', ')}
      >bound by {reading.overall.binding.length}: {reading.overall.binding.join(', ')}</span>
  {/if}
</li>

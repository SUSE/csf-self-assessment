<script lang="ts">
  import { cn } from '../../utils/cn';
  import ReadingRow from './reading-row.svelte';
  import type { Reading } from './readings';

  // The instrument's readings, beside the figure they describe: the counts that
  // don't ride a spoke, one per row, hairline-separated. Internal to
  // instrument-wheel — the host owns where it sits in the flex row.
  type Props = {
    readings: Reading[];
    class?: string;
  };
  let { readings, class: className }: Props = $props();
</script>

<ul
  class={cn('divide-y divide-border/60 border-y border-border/60', className)}
  aria-label="Instrument counts"
>
  {#each readings as reading (reading.id)}
    <ReadingRow {reading} />
  {/each}
</ul>

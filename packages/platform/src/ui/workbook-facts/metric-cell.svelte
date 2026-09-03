<script module lang="ts">
  // One width for the cell and its column header, so the numerals form a real column.
  export const METRIC_CELL = 'flex w-24 shrink-0 items-center gap-2';
</script>

<script lang="ts">
  import RatioBar from '../dashboard/ratio-bar.svelte';

  // A count read twice: the numeral is the value, the bar is its size against the
  // largest in the column. The unit is said once in the header, so each row carries
  // it for assistive tech only.
  type Props = {
    value: number;
    /** Value over the column's maximum. */
    fraction: number;
    unit: string;
  };
  let { value, fraction, unit }: Props = $props();
</script>

<span class={METRIC_CELL}>
  <span class="w-8 shrink-0 text-right font-mono text-xs tabular-nums">
    <span class="sr-only">{unit}: </span>{value}
  </span>
  <RatioBar {fraction} class="w-14" />
</span>

<script lang="ts">
  import RatioBar from '../../ratio-bar.svelte';
  import UnitField, { fieldDrawable } from '../../unit-field.svelte';

  // The reading of what is left: the count, and the population it is a count of.
  // Both ledgers (owner chips at rest, OpenGroup sections maximised) are read
  // under this, so it is one component rather than a branch in each of them.
  //
  // Why the field replaces the bar. A 4.5% ratio bar says "nothing has happened"
  // for a standing that is "almost everything has" — the reason `align="end"`
  // was there at all. The field is read correctly at a glance, and the bar comes
  // back, unchanged, for populations too large to draw a cell each (see
  // unit-field.svelte's CAP).
  //
  // The rail may shrink below its 16rem basis (`min-w-0`, no `shrink-0`): at the
  // narrow end a rail that refuses to give ground pushes the card into overflow,
  // and the field inside it wraps to more rows quite happily. `max-w-md` is the
  // other end — maximised, the band is 1470px wide and a field spread that far
  // is a stripe, not a population.
  const RAIL = 'min-w-0 max-w-md flex-[1_1_16rem]';

  let { total, open }: { total: number; open: number } = $props();

  const drawable = $derived(fieldDrawable(total));
  const openShare = $derived(total > 0 ? open / total : 0);
</script>

<div class={RAIL}>
  <p data-whats-left-count class="flex items-baseline gap-1.5 text-card-foreground">
    <span class="text-3xl font-semibold tabular-nums">{open}</span>
    <span class="text-xs text-muted-foreground">
      {`open of ${total} ${total === 1 ? 'unit' : 'units'}`}
    </span>
  </p>
  {#if drawable}
    <UnitField {total} {open} class="mt-2 w-full" data-whats-left-field />
  {:else}
    <RatioBar
      fraction={openShare}
      align="end"
      fill="open"
      class="mt-2 w-full"
      data-whats-left-bar />
  {/if}
</div>

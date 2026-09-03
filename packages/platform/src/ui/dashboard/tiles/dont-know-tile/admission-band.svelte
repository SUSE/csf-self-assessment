<script lang="ts">
  import BandSlice from './band-slice.svelte';
  import ToneKey from './tone-key.svelte';

  // The admitted units as shares of the base that carries them — gating in full
  // structural ink, the rest in the soft ink the ribbon's band spends on a don't-know.
  // Shares, not a mark per unit: one admission in eighty has to look like one.
  let {
    gating,
    others,
    placed,
    class: className = '',
  }: {
    gating: number;
    others: number;
    /** Units carrying an answer of any state. Zero draws the bare track. */
    placed: number;
    class?: string;
  } = $props();

  const admitted = $derived(gating + others);
  const share = $derived((n: number) => (placed > 0 ? Math.min(1, n / placed) : 0));
  const base = $derived(placed > 0 ? `${placed} answered units` : '');
  const label = $derived(
    placed === 0
      ? 'Nothing carries an answer yet'
      : admitted === 0
        ? `No admission over ${placed} answered units`
        : `${admitted} of ${placed} answered units admit a don’t-know, ${gating} of them gating the floor`,
  );
</script>

<div class={className}>
  <span role="img" aria-label={label} class="flex h-1.5 overflow-hidden rounded bg-muted">
    {#if gating > 0}
      <BandSlice kind="gating" paint="bg-axis-ink" share={share(gating)} />
    {/if}
    {#if others > 0}
      <BandSlice kind="others" paint="bg-axis-ink-soft" share={share(others)} />
    {/if}
  </span>

  {#if admitted > 0 || base}
    <p class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <!-- A tone is named only where it is drawn: a key to an absent mark is a puzzle. -->
      {#if gating > 0}
        <ToneKey paint="bg-axis-ink" label="gates the floor" />
      {/if}
      {#if others > 0}
        <ToneKey paint="bg-axis-ink-soft" label="moves no number" />
      {/if}
      {#if base}<span data-dont-know-base class="tabular-nums">{base}</span>{/if}
    </p>
  {/if}
</div>

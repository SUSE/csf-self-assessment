<script lang="ts">
  // A pointer, never the pitch: the finding says which offers answer it and the
  // offers stay in their own attributed chapter, so a forwarded copy can always
  // tell the estate's words from a supplier's. Past three it counts rather than
  // lists — eight ordinals in a row read as a catalogue, not a cross-reference.
  const NAMED = 3;

  let { ordinals }: { ordinals: number[] } = $props();

  const labels = $derived(ordinals.map((n) => String(n).padStart(2, '0')));
  const subject = $derived(
    ordinals.length > NAMED
      ? `${ordinals.length} offers`
      : ordinals.length === 1
        ? `Offer ${labels[0]}`
        : `Offers ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`,
  );
</script>

{#if ordinals.length > 0}
  <p data-report-offer-pointer class="text-xs text-muted-foreground">
    {subject}
    {ordinals.length === 1 ? 'addresses' : 'address'} questions listed here — see Recommendations.
  </p>
{/if}

<script lang="ts">
  import type { DontKnowTile } from '../../../../analytics';
  import AdmissionBand from './admission-band.svelte';

  // Absence as an em-dash and a sentence, never a zero — under the same band, drawn
  // bare, so the tile reads as measured rather than as one that failed to render.
  let { view }: { view: Extract<DontKnowTile, { kind: 'none' }> } = $props();
</script>

<p data-dont-know-empty class="flex items-baseline gap-2 text-lg font-semibold">
  <span aria-hidden="true" class="text-muted-foreground">—</span>
  <span class="text-card-foreground">Nothing admitted</span>
</p>
<AdmissionBand gating={0} others={0} placed={view.placed} class="mt-2 w-full" />

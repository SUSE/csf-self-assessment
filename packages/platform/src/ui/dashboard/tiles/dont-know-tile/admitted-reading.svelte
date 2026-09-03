<script lang="ts">
  import type { DontKnowTile } from '../../../../analytics';
  import AdmissionBand from './admission-band.svelte';

  // The claim, then how much of the reading it is, then what the tones are.
  let { view }: { view: Extract<DontKnowTile, { kind: 'admitted' }> } = $props();
</script>

<p data-dont-know-headline class="text-lg font-semibold text-card-foreground">{view.headline}</p>
<AdmissionBand
  gating={view.holes}
  others={view.total - view.holes}
  placed={view.placed}
  class="mt-2 w-full" />

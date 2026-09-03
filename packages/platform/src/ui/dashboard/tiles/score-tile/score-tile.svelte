<script lang="ts">
  import { scoreTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import ScoreReading from './score-reading.svelte';

  // How we rank, given we clear the floor. A rank is never a substitute for the
  // floor, and nothing material answered is not a score of zero.
  //
  // The arc is painted in the FLOOR's seal, so the rank is never read apart from
  // the gate it sits above — a long arc in a SEAL-0 ink still says SEAL-0. The
  // seal rides `data-seal` on the element carrying the ink (product invariant
  // #7); with no floor there is no seal to paint and the gauge stays hue-free.
  let { result }: TileProps = $props();

  const model = $derived(scoreTile(result));
</script>

<ScoreReading {model} />

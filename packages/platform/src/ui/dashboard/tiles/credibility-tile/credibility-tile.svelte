<script lang="ts">
  import { credibilityTile } from '../../../../analytics';
  import type { TileProps } from '../../tile-props';
  import CredibilityBody from './credibility-body.svelte';

  // How was this file produced, and by whom? A structural tile (analytics §4.7):
  // no seal, no ramp and no navigation — a ledger record is a claim about a claim.
  //
  // Summarised, never listed. A workshop can land any number of partials, so the
  // dial folds its own tail and each ratio is two lines: the tile is the same
  // height for a room of twenty as for a room of two. The records themselves are
  // Merge → History's, and the Report prints the disputed ones in full.
  let { result, workbook }: TileProps = $props();

  const view = $derived(credibilityTile(result, workbook));
</script>

<CredibilityBody {view} />

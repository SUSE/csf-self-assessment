<script lang="ts">
  import type { TileProps } from '../../tile-props';
  import HeatTile from '../heat-tile.svelte';

  let props: TileProps = $props();
</script>

<HeatTile {...props} axis="role" />

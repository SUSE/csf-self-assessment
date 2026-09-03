<script lang="ts">
  import { markerRadius, polar, CX, CY } from '../wheel';
  import { sealInkClass } from '../../utils/seal-color';
  import { markerTitle, type MergeChip } from './model';

  // The serves edges outside the rim, read in the chip's own direction: a party
  // chip's reach, or the parties standing under a dimension.
  type Props = { chip: MergeChip; deg: number; rim: number };
  let { chip, deg, rim }: Props = $props();
</script>

{#each chip.exposure as marker, mi (marker.key)}
  {@const at = polar(CX, CY, markerRadius(rim, mi), deg)}
  <g>
    <title>{markerTitle(chip, marker)}</title>
    {#if chip.kind === 'party'}
      <circle
        cx={at[0]}
        cy={at[1]}
        r="4.5"
        fill={marker.emphasis ? 'currentColor' : 'none'}
        stroke="currentColor"
        stroke-width="1"
        class="text-muted-foreground"
      />
    {:else if marker.seal === null}
      <circle
        cx={at[0]}
        cy={at[1]}
        r="5"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-dasharray="2 2"
        class="text-muted-foreground"
      />
    {:else}
      <circle cx={at[0]} cy={at[1]} r="5" fill="currentColor" class={sealInkClass(marker.seal)} />
      <circle cx={at[0]} cy={at[1]} r="2" fill="currentColor" class="text-background" />
    {/if}
  </g>
{/each}

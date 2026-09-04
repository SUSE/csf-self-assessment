<script lang="ts">
  import { markerRadius, polar, CX, CY } from '../wheel';
  import { sealInkClass } from '../../utils/seal-color';
  import { markerTitle, type WheelUnit } from './model';

  // The third parties serving this unit's dimension, stacked OUTSIDE the rim. A
  // don't-know already holds the first slot, so the stack starts one out.
  type Props = { unit: WheelUnit; deg: number; rim: number };
  let { unit, deg, rim }: Props = $props();

  const offset = $derived(unit.state === 'dont-know' ? 1 : 0);
</script>

{#each unit.exposure as marker, mi (marker.key)}
  {@const at = polar(CX, CY, markerRadius(rim, mi + offset), deg)}
  <g>
    <title>{markerTitle(marker)}</title>
    {#if marker.seal === null}
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

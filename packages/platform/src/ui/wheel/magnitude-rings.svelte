<script lang="ts">
  import { CX, CY, HUB } from './geometry';

  // Concentric quarter guides between hub and rim, so a spoke's length reads as a
  // magnitude rather than a bare stick.
  type Props = { rim: number };
  let { rim }: Props = $props();
</script>

{#each [1, 2, 3, 4] as step (step)}
  <circle
    cx={CX}
    cy={CY}
    r={HUB + ((rim - HUB) * step) / 4}
    fill="none"
    stroke="currentColor"
    stroke-width="0.5"
    class="text-border"
  />
{/each}

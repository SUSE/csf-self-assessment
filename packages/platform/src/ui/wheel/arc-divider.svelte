<script lang="ts">
  import { CX, CY } from './geometry';

  // The 12–6 o'clock line separating the two arcs. It is a boundary, not an axis:
  // the right arc and the left arc are disjoint families, and nothing may read
  // across it.
  type Props = { rim: number };
  let { rim }: Props = $props();
</script>

<line
  x1={CX}
  y1={CY - rim - 8}
  x2={CX}
  y2={CY + rim + 8}
  stroke="currentColor"
  stroke-width="0.5"
  stroke-dasharray="3 4"
  class="text-border"
/>

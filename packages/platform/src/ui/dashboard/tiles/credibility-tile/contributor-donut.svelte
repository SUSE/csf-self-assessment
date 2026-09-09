<script lang="ts">
  import { Chart, Pie, Svg } from 'layerchart';
  import * as ChartUI from '../../../chart';
  import ContributorArc from './contributor-arc.svelte';
  import { contributorInkClass } from './contributor-paint';
  import type { ContributorRow } from './contributor-rows';

  // Who placed what stands, drawn as a closed dial. A composition is an arc and a
  // part-of-whole is a bar: the ranked bars this replaced spent three lines per
  // person and read as five unrelated ratios, when the one thing being asked is
  // how one file divides between the people who produced it.
  
  // Height is the dial's, not the roster's. The rows arrive already folded, so a
  // room of twenty draws the same five slices as a room of five.
  
  // The hub carries the sum of the arcs over a muted caption — the wheels' hub
  // idiom, 15px/600 over 10px, so this reads as one of the dashboard's dials.
  let {
    rows,
    standing,
  }: {
    rows: ContributorRow[];
    /** Units the slices are shares of — the arcs add up to this.*/
    standing: number;
  } = $props();

  /** Offset from the outer radius, so the ring keeps its weight at any size.*/
  const THICKNESS = -8;
  /** The seam does as much separating as the ink step does, so it is wider than a
   * hairline. A seam in a single full ring reads as a rendering fault, not as a
   * division, so one slice gets none.*/
  const pad = $derived(rows.length > 1 ? 0.035 : 0);
</script>

<ChartUI.Container config={{}} class="aspect-square w-24 shrink-0">
  <Chart data={rows} x="units">
    <Svg center>
      <Pie sort={null} innerRadius={THICKNESS} cornerRadius={1} padAngle={pad}>
        {#snippet children({ arcs })}
          {#each arcs as arc, index (arc.data.key)}
            <ContributorArc
              row={arc.data}
              {arc}
              ink={contributorInkClass(index)}
              thickness={THICKNESS} />
          {/each}
        {/snippet}
      </Pie>

      <text
        data-contributor-total
        x="0"
        y="-4"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="15"
        font-weight="600"
        class="fill-card-foreground tabular-nums">{standing}</text>
      <text
        x="0"
        y="10"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="10"
        class="fill-muted-foreground">{standing === 1 ? 'answer' : 'answers'}</text>
    </Svg>
  </Chart>
</ChartUI.Container>

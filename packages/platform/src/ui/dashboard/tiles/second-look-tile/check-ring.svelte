<script lang="ts">
  import { Arc, Chart, Svg } from 'layerchart';
  import * as ChartUI from '../../../chart';

  // One check as a closed dial: the share of what it read that it is asking about,
  // with the fraction in the hub. The arc uses the active theme color.
  // A clear check has no tail and draws its bare track in the structural ink.
  let {
    part,
    whole,
  }: {
    part: number;
    /** Zero draws the empty track — the check read nothing to be a share of.*/
    whole: number;
  } = $props();

  const ink = $derived(part > 0 ? 'text-primary' : 'text-foreground');
</script>

<ChartUI.Container config={{}} class="aspect-square w-16 shrink-0">
  <Chart>
    <Svg center>
      <Arc
        data-check-arc
        value={part}
        domain={[0, Math.max(1, whole)]}
        range={[0, 360]}
        innerRadius={-7}
        track={{ class: 'fill-background/70 stroke-border' }}
        class={`fill-current ${ink}`} />
      <text
        data-check-fraction
        x="0"
        y="0"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="12"
        class="fill-card-foreground tabular-nums">{whole === 0 ? '—' : `${part}/${whole}`}</text>
    </Svg>
  </Chart>
</ChartUI.Container>

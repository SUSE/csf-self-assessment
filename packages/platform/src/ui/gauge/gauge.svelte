<script lang="ts">
  import { Arc, Chart, Svg } from 'layerchart';
  import { cn } from '../../utils/cn';
  import * as ChartUI from '../chart';

  // A single value read against its scale, drawn as an open radial arc — the
  // dashboard's own idiom, so a ratio tile sits beside the rings rather than
  // beneath a web-form progress bar.
  //
  // Deliberately HUE-FREE: a gauge encodes a ratio out of `max`, never a SEAL
  // rung, and under the SUSE palette `--primary` IS the seal hue — a green arc
  // here would read as "SEAL-good". Callers that mean a seal pass `arcClass`.
  type Props = {
    value: number;
    /** Top of the scale. The arc fills `value / max` of its sweep. */
    max?: number;
    /** The big reading at the centre, already formatted (`51.7%`). */
    label: string;
    /** One short line under the reading. */
    caption?: string | undefined;
    /** Scale ends, printed below the arc's open mouth. */
    minLabel?: string | undefined;
    maxLabel?: string | undefined;
    /** Paint for the value arc. Hue-free ink by default. */
    arcClass?: string | undefined;
    /** Paint for the unfilled remainder. A translucent step toward `--background`
     *  reads as a recessed groove on a card in BOTH modes and under every
     *  palette — `fill-muted` collapses into the card on some of them. */
    trackClass?: string | undefined;
    class?: string | undefined;
  };
  let {
    value,
    max = 100,
    label,
    caption,
    minLabel,
    maxLabel,
    arcClass = 'fill-foreground/70',
    trackClass = 'fill-background/70 stroke-border',
    class: className,
  }: Props = $props();

  /** The arc's open mouth, in degrees either side of 12 o'clock. */
  const SWEEP = 130;
</script>

<ChartUI.Container config={{}} class={cn('mx-auto aspect-[3/2] w-full max-w-[260px]', className)}>
  <Chart>
    <Svg center>
      <Arc
        data-gauge-arc
        {value}
        domain={[0, max]}
        range={[-SWEEP, SWEEP]}
        innerRadius={-14}
        cornerRadius={7}
        track={{ class: trackClass }}
        class={arcClass}>
        <!-- The scale ends ride the arc's OWN outer radius, so they stay at its
             mouth whatever size the container resolves to. -->
        {#snippet children({ outerRadius })}
          {@const rad = (SWEEP * Math.PI) / 180}
          {#if minLabel !== undefined}
            <text
              x={-outerRadius * Math.sin(rad)}
              y={-outerRadius * Math.cos(rad) + 16}
              text-anchor="middle"
              font-size="10"
              class="fill-muted-foreground">{minLabel}</text>
          {/if}
          {#if maxLabel !== undefined}
            <text
              x={outerRadius * Math.sin(rad)}
              y={-outerRadius * Math.cos(rad) + 16}
              text-anchor="middle"
              font-size="10"
              class="fill-muted-foreground">{maxLabel}</text>
          {/if}
        {/snippet}
      </Arc>

      <text
        data-gauge-label
        x="0"
        y="0"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="30"
        font-weight="500"
        class="fill-card-foreground">{label}</text>

      {#if caption !== undefined}
        <text
          data-gauge-caption
          x="0"
          y="26"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="11"
          class="fill-muted-foreground">{caption}</text>
      {/if}
    </Svg>
  </Chart>
</ChartUI.Container>

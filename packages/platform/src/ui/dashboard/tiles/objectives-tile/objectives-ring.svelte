<script lang="ts">
  import type { ObjectiveArc, ObjectiveRung } from '../../../../analytics';
  import { sealInkClass, sealSwatchClass } from '../../../../utils/seal-color';
  import { labelRadius, placeLabels, polar, truncate, CX, CY, RIM, WHEEL_VIEWBOX } from '../../../wheel';

  // The objectives in one frame: geometry in, nothing looked up. A wedge is as
  // wide as the weight its objective carries and as long as the SEAL it stands
  // at, read against the rung rings. Absence, informational and SEAL-0 are three
  // different marks (analytics invariant #2) — a wedge with nothing asserted is
  // flat, never a short one.
  type Props = { arcs: ObjectiveArc[]; rungs: ObjectiveRung[] };
  let { arcs, rungs }: Props = $props();

  /** Clear of the rung numbers, which ride the 12 o'clock line out to the rim. */
  const LABEL_R = labelRadius(RIM, 0) + 12;
  /** The label face is 12px here, one step down from the wheels', so a longer
   *  name still clears the viewBox edge. */
  const NAME_MAX = 26;
  /** Degrees shaved off each side of a wedge so neighbours never touch. */
  const PAD_DEG = 0.8;

  const labels = $derived(
    placeLabels(
      arcs.map((arc) => ({ deg: arc.midFraction * 360, r: LABEL_R })),
      CX,
      CY,
      { minGap: 30, maxSpan: WHEEL_VIEWBOX.height - 60 },
    ),
  );

  /** A wedge from the hub out to `r`, in the wheel's clockwise-from-12 space. */
  function wedge(arc: ObjectiveArc, r: number): string {
    const span = (arc.endFraction - arc.startFraction) * 360;
    const pad = span > PAD_DEG * 4 ? PAD_DEG : span / 8;
    const from = arc.startFraction * 360 + pad;
    const to = arc.endFraction * 360 - pad;
    const [x1, y1] = polar(CX, CY, r, from);
    const [x2, y2] = polar(CX, CY, r, to);
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  // The seal ink rides the <g> that carries `data-seal`; the wedge inherits it
  // through `fill="currentColor"`, so no seal-coloured mark exists without its
  // seal attribute beside it (product invariant #7).
  function inkClass(arc: ObjectiveArc): string {
    return arc.standing.kind === 'asserted'
      ? sealInkClass(arc.standing.seal)
      : 'text-muted-foreground';
  }
</script>

<svg
  viewBox={`0 0 ${WHEEL_VIEWBOX.width} ${WHEEL_VIEWBOX.height}`}
  role="img"
  aria-label={`Objectives ring — ${arcs.length} wedges, each as wide as the weight it carries and as long as the SEAL it stands at`}
  class="mx-auto w-full max-h-[320px] text-foreground">
  <title>Objectives ring</title>

  {#each rungs as rung (rung.seal)}
    <circle
      data-objective-rung={rung.seal}
      cx={CX}
      cy={CY}
      r={RIM * rung.radiusFraction}
      fill="none"
      stroke="currentColor"
      stroke-width="0.5"
      class="text-border" />
  {/each}

  {#each arcs as arc, i (arc.id)}
    {@const label = labels[i]}
    <g
      data-objective-arc={arc.id}
      data-objective-standing={arc.standing.kind}
      data-seal={arc.standing.kind === 'asserted' ? arc.standing.seal : undefined}
      class={inkClass(arc)}>
      <title>{arc.summary}</title>

      <path
        data-objective-track
        d={wedge(arc, RIM)}
        class={arc.standing.kind === 'informational'
          ? 'fill-muted/20 stroke-muted-foreground [stroke-dasharray:3_3]'
          : 'fill-muted/30'}
        stroke-width="1" />

      {#if arc.standing.kind === 'asserted'}
        <path d={wedge(arc, RIM * arc.standing.radiusFraction)} fill="currentColor" />
      {/if}

      <text
        x={label.x}
        y={label.y}
        text-anchor={label.anchor}
        font-size="12"
        fill="currentColor"
        class="text-foreground">
        {truncate(arc.name, NAME_MAX)}
      </text>
      <text
        x={label.x}
        y={label.y + 13}
        text-anchor={label.anchor}
        font-size="10"
        fill="currentColor"
        class={arc.standing.kind === 'asserted' ? inkClass(arc) : 'text-muted-foreground'}>
        {arc.sub}
      </text>
    </g>
  {/each}

  <!-- The radial axis, drawn last so the rung numbers stay legible over a wedge.
       They sit on the 12 o'clock line, which is a wedge boundary by construction. -->
  {#each rungs as rung (rung.seal)}
    <circle cx={CX} cy={CY - RIM * rung.radiusFraction} r="7" fill="currentColor" class="text-background" />
    <text
      data-objective-rung-label={rung.seal}
      x={CX}
      y={CY - RIM * rung.radiusFraction}
      text-anchor="middle"
      dominant-baseline="central"
      font-size="9"
      fill="currentColor"
      class="text-muted-foreground">{rung.seal}</text>
  {/each}
</svg>

<ul data-objectives-legend class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
  <li class="flex items-center gap-1.5">
    <svg viewBox="0 0 16 16" class="size-4 text-foreground" aria-hidden="true">
      <path d="M 2 14 L 2 2 A 12 12 0 0 1 14 14 Z" class="fill-muted/30" />
      <path d="M 2 14 L 2 7 A 7 7 0 0 1 9 14 Z" fill="currentColor" />
    </svg>
    length is the SEAL it stands at
  </li>
  <li class="flex items-center gap-1.5">
    <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
      <path
        d="M 2 14 L 2 2 A 12 12 0 0 1 14 14 Z"
        class="fill-muted/20 stroke-muted-foreground [stroke-dasharray:2_2]"
        stroke-width="1" />
    </svg>
    informational, never scored
  </li>
  <li class="flex items-center gap-1.5">
    <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
      <path d="M 2 14 L 2 2 A 12 12 0 0 1 14 14 Z" class="fill-muted/30" />
    </svg>
    nothing asserted yet
  </li>
  <li class="flex items-center gap-1.5">
    <span>SEAL</span>
    {#each rungs as rung (rung.seal)}
      <span class="flex items-center gap-0.5">
        <span data-legend-seal={rung.seal} class={`size-3 rounded-xs ${sealSwatchClass(rung.seal)}`}
        ></span>
        <span>{rung.seal}</span>
      </span>
    {/each}
  </li>
</ul>

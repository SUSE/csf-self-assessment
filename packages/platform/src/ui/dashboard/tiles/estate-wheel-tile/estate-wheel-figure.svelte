<script lang="ts">
  import type { EstateSpoke } from '../../../../analytics';
  import { provenanceStrokeClass } from '../../../../utils/provenance-lens';
  import { sealInkClass } from '../../../../utils/seal-color';
  import {
    activateOnKey,
    labelRadius,
    placeLabels,
    polar,
    truncate,
    CX,
    CY,
    HUB,
    RIM,
    WHEEL_VIEWBOX,
  } from '../../../wheel';
  import ArcDivider from '../../../wheel/arc-divider.svelte';
  import HitLane from '../../../wheel/hit-lane.svelte';
  import MagnitudeRings from '../../../wheel/magnitude-rings.svelte';
  import WheelHub from '../../../wheel/wheel-hub.svelte';

  // The estate in one frame: geometry in, nothing looked up. Spoke length is the
  // weakest asserted material seal on that axis; a ghost runs the full rim dashed
  // and carries no seal at all (absence is not a zero, analytics invariant #2).
  type Props = {
    spokes: EstateSpoke[];
    selected: string | null;
    tint: boolean;
    /** null = a static drawing: the spoke group carries no role, no tab stop and
     *  no handler (report.md §3.3). */
    onSelect: ((mark: string) => void) | null;
  };
  let { spokes, selected, tint, onSelect }: Props = $props();

  const LABEL_R = labelRadius(RIM, 0);

  const labels = $derived(
    placeLabels(
      spokes.map((s) => ({ deg: s.deg, r: LABEL_R })),
      CX,
      CY,
      { minGap: 22, maxSpan: WHEEL_VIEWBOX.height - 72 },
    ),
  );

  function reach(spoke: EstateSpoke): number {
    return spoke.standing.kind === 'asserted' ? HUB + (RIM - HUB) * spoke.standing.fraction : RIM;
  }

  // The seal ink rides the <g> — the one element carrying `data-seal` — and the
  // painted line inherits it through `currentColor`, so no green mark can exist
  // without its seal attribute beside it (product invariant #7).
  function inkClass(spoke: EstateSpoke): string {
    return spoke.standing.kind === 'asserted'
      ? sealInkClass(spoke.standing.seal)
      : 'text-muted-foreground';
  }

  function strokeClass(spoke: EstateSpoke): string {
    if (spoke.standing.kind !== 'asserted') return '[stroke-dasharray:2_2]';
    return tint ? provenanceStrokeClass(spoke.standing.provenance) : '';
  }

</script>

<svg
  viewBox={`0 0 ${WHEEL_VIEWBOX.width} ${WHEEL_VIEWBOX.height}`}
  role="img"
  aria-label={`Estate wheel — ${spokes.length} spokes, each as long as the weakest material answer on it`}
  class="mx-auto w-full text-foreground">
  <title>Estate wheel</title>

  <MagnitudeRings rim={RIM} />
  <ArcDivider rim={RIM} />

  {#each spokes as spoke, i (spoke.key)}
    {@const hubPt = polar(CX, CY, HUB, spoke.deg)}
    {@const endPt = polar(CX, CY, reach(spoke), spoke.deg)}
    {@const label = labels[i]}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      role={onSelect === null ? undefined : 'button'}
      tabindex={onSelect === null ? undefined : 0}
      aria-pressed={onSelect === null ? undefined : selected === spoke.key}
      onclick={onSelect === null ? undefined : () => onSelect(spoke.key)}
      onkeydown={onSelect === null ? undefined : (e) => activateOnKey(e, () => onSelect(spoke.key))}
      data-spoke={spoke.key}
      data-seal={spoke.standing.kind === 'asserted' ? spoke.standing.seal : undefined}
      data-ghost={spoke.standing.kind === 'ghost' ? 'true' : undefined}
      data-provenance={tint && spoke.standing.kind === 'asserted'
        ? spoke.standing.provenance
        : undefined}
      data-selected={selected === spoke.key ? 'true' : undefined}
      aria-label={spoke.summary}
      class={`${onSelect === null ? '' : 'cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'} ${inkClass(spoke)}`}>
      <title>{spoke.summary}</title>

      <HitLane deg={spoke.deg} reach={LABEL_R + 18} />

      <line
        x1={hubPt[0]}
        y1={hubPt[1]}
        x2={polar(CX, CY, RIM, spoke.deg)[0]}
        y2={polar(CX, CY, RIM, spoke.deg)[1]}
        stroke="currentColor"
        stroke-width="0.75"
        class="text-border" />

      <line
        x1={hubPt[0]}
        y1={hubPt[1]}
        x2={endPt[0]}
        y2={endPt[1]}
        stroke="currentColor"
        stroke-width="7"
        stroke-linecap="butt"
        class={strokeClass(spoke)} />

      {#each spoke.ticks as tick, t (tick.stratum)}
        {@const at = polar(
          CX,
          CY,
          HUB + ((reach(spoke) - HUB) * (t + 1)) / (spoke.ticks.length + 1),
          spoke.deg,
        )}
        {@const rad = (spoke.deg * Math.PI) / 180}
        <line
          data-tick={tick.stratum}
          data-seal={tick.seal}
          x1={at[0] - Math.cos(rad) * 6}
          y1={at[1] - Math.sin(rad) * 6}
          x2={at[0] + Math.cos(rad) * 6}
          y2={at[1] + Math.sin(rad) * 6}
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          class={sealInkClass(tick.seal)} />
      {/each}

      <text
        x={label.x}
        y={label.y}
        text-anchor={label.anchor}
        font-size="13"
        fill="currentColor"
        class="text-foreground">
        <title>{spoke.label}</title>{truncate(spoke.label)}
      </text>
    </g>
  {/each}

  <WheelHub />
</svg>

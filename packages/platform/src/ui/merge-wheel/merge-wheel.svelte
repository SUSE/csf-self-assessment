<script lang="ts">
  import type { Answer, Party, Seal, Target, Workbook } from '../../schema';
  import type { ExposureEdge } from '../../score-engine';
  import type { LandingClash } from '../../merge';
  import {
    chipAngles,
    labelRadius,
    placeLabels,
    CX,
    CY,
    RINGS_EXPOSED,
    RINGS_PLAIN,
    WHEEL_VIEWBOX,
  } from '../wheel';
  import ArcDivider from '../wheel/arc-divider.svelte';
  import MagnitudeRings from '../wheel/magnitude-rings.svelte';
  import WheelHub from '../wheel/wheel-hub.svelte';
  import SpokeHit from '../wheel/spoke-hit.svelte';
  import ChipSpoke from './chip-spoke.svelte';
  import { chipTitle, mergeWheelModel, type ChipScope, type MergeChip } from './model';

  // The facilitator's estate wheel, in QuestionWheel's grammar one
  // level up: the spokes are the estate's chips, dimensions on the right arc and
  // parties on the left, split because they are disjoint axes — nothing here should
  // imply a dimension × party cell, because no answer can ever occupy one.
  
  // mode="coverage" — the spoke fills hub-to-rim with what is dealt with:
  // covered, then claimed-incomplete (a person's gap — chase them), then
  // unclaimed (an estate gap — nobody's pass reached it). Only the SCOPE LOG
  // separates the last two, so `scope` is a host input.
  // without it everything outstanding reads as unclaimed, which is the honest
  // degraded answer rather than a guess.
  // mode="merge" — radius reverts to the SEAL rung, and an unresolved conflict is
  // literally the span between the two rungs two partials asserted. Resolving
  // collapses it to one dot that keeps its ring, because the resolution
  // survives in the file as a mergeEvent.
  
  // The hub reads "— at finalize" until `floor` is passed in. That is deliberate:
  // only the finalized assessment carries a floor or a score, so a working merge
  // showing a provisional SEAL would assert something the artifact does not hold.
  // The wheel computes no truth. `floor` must come from `evaluate`.

  type Props = {
    workbook: Workbook;
    parties: Party[];
    /** The union of every accepted partial's answers so far.*/
    answers: Answer[];
    mode?: 'coverage' | 'merge';
    clashes?: LandingClash[];
    resolutions?: { questionId: string; target: Target; seal: Seal }[];
    scope?: ChipScope[];
    /** From `evaluate` after finalize. Null keeps the hub honest.*/
    floor?: Seal | null;
    unknowns?: number;
    selected?: { kind: string; key: string } | null;
    onSelect?: (chip: MergeChip) => void;
    size?: number;
    /** `evaluate.exposure`. Absent = no marker ring. Dimension chips gain the
     * parties standing under them. party chips gain their reach.*/
    exposure?: ExposureEdge[];
    /** Override the auto-hide (the ring is hidden when every chip looks alike).*/
    showExposure?: boolean;
  };

  let {
    workbook,
    parties,
    answers,
    mode = 'coverage',
    clashes = [],
    resolutions = [],
    scope = [],
    floor = null,
    unknowns = 0,
    selected = null,
    onSelect,
    size = WHEEL_VIEWBOX.width,
    exposure = [],
    showExposure,
  }: Props = $props();

  const model = $derived(
    mergeWheelModel({
      workbook,
      parties,
      answers,
      clashes,
      resolutions,
      scope,
      floor,
      unknowns,
      exposure,
    }),
  );
  const exposed = $derived(showExposure ?? (model.maxExposure > 0 && model.exposureInformative));
  const RINGS = $derived(exposed ? RINGS_EXPOSED : RINGS_PLAIN);
  const RIM = $derived(RINGS[4]);
  const LABEL_R = $derived(labelRadius(RIM, exposed ? model.maxExposure : 0));
  const spokes = $derived(chipAngles(model.chips));
  // `minGap` is 20, not the default 34, because a label is one line here, not two.
  // a gap sized for a two-line block shoved every label off its own spoke's angle.
  // `placeLabels` only spreads the two side columns, never the pole, so the pole's
  // clearance from the first label of each arc has to come from the radius.
  const POLE_LIFT = 14;
  const labels = $derived(
    placeLabels(
      spokes.map(({ deg }) => ({
        deg,
        r: deg === 0 || deg === 180 ? LABEL_R + POLE_LIFT : LABEL_R,
      })),
      CX,
      CY,
      { minGap: 20, hGap: 8, maxSpan: WHEEL_VIEWBOX.height - 48 },
    ),
  );

  function isSelected(chip: MergeChip): boolean {
    return selected?.kind === chip.kind && selected?.key === chip.key;
  }
</script>

<svg
  width={size}
  viewBox={`0 0 ${WHEEL_VIEWBOX.width} ${WHEEL_VIEWBOX.height}`}
  role="img"
  class="mx-auto max-w-full text-foreground"
  aria-label={`Estate chips — ${model.covered} of ${model.total} units covered, ${model.openConflicts} conflicts open`}
>
  <title>Estate chips</title>
  <desc>
    Dimension chips on the right arc, party chips on the left, the whole-estate chip at the top.
    {model.covered} of {model.total} units covered, {model.claimedIncomplete} claimed-incomplete,
    {model.unclaimed} unclaimed, {model.openConflicts} conflicts still open.
    {#if exposed}
      Markers outside the rim are the serves edges: parties under each dimension, dimensions under each
      party.
    {/if}
  </desc>

  {#if mode === 'coverage'}
    <MagnitudeRings rim={RIM} />
  {:else}
    {#each RINGS as r (r)}
      <circle cx={CX} cy={CY} {r} fill="none" stroke="currentColor" stroke-width="0.5" class="text-border" />
    {/each}
    {#if model.floor !== null}
      <circle
        cx={CX}
        cy={CY}
        r={RINGS[model.floor]}
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-dasharray="5 4"
        class="text-destructive"
      />
    {/if}
  {/if}

  <ArcDivider rim={RIM} />

  {#each spokes as entry, i (entry.chip.kind + ':' + entry.chip.key)}
    <SpokeHit
      title={chipTitle(entry.chip)}
      onActivate={onSelect ? () => onSelect(entry.chip) : undefined}
    >
      <ChipSpoke
        chip={entry.chip}
        deg={entry.deg}
        active={isSelected(entry.chip)}
        label={labels[i]}
        {mode}
        rings={RINGS}
        rim={RIM}
        labelR={LABEL_R}
        {exposed}
      />
    </SpokeHit>
  {/each}

  <WheelHub>
    <text
      x={CX}
      y={CY - 2}
      text-anchor="middle"
      font-size="13"
      font-weight="500"
      fill="currentColor"
      class={model.floor === null ? 'text-muted-foreground' : 'text-foreground'}
    >
      {model.floor === null ? '—' : `SEAL-${model.floor}`}
    </text>
    <text x={CX} y={CY + 13} text-anchor="middle" font-size="11" fill="currentColor" class="text-muted-foreground">
      {model.floor === null
        ? 'at finalize'
        : model.unknowns > 0
          ? `${model.unknowns} unknown${model.unknowns === 1 ? '' : 's'}`
          : 'finalized'}
    </text>
  </WheelHub>
</svg>

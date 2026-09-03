<script lang="ts">
  import type { Answer, Party, Question, Target, Workbook } from '../../schema';
  import type { ExposureEdge } from '../../score-engine';
  import { targetKey } from '../../assessment';
  import {
    labelRadius,
    ringRadius,
    spokeAngles,
    RINGS_EXPOSED,
    RINGS_PLAIN,
    WHEEL_VIEWBOX,
  } from '../wheel';
  import SpokeHit from '../wheel/spoke-hit.svelte';
  import QuestionSpoke from './question-spoke.svelte';
  import { isBinding, questionWheelModel, unitTitle, wheelSummary } from './model';

  // One question's fan-out as a wheel (spec §4.1). ANGLE is the target unit, RADIUS
  // is the SEAL rung — rung position IS the level, so the wheel needs no separate
  // legend for what a dot means, and the units that gate collapse onto the innermost
  // one. What is still to do reads off the picture in three distinct kinds:
  // dashed spoke = no record; hollow ring beyond the rim = don't-know; a gating dot
  // with no evidence diamond = placed but undefended (spec §5.3).
  //
  // Pass `exposure` and a second ring appears OUTSIDE the rim: the third parties
  // that serve each dimension, as donut markers coloured by their own
  // compellability answer. They are edges, not units — no state, no placement, and
  // never inside the rim, so nothing implies a dimension × party answer that cannot
  // exist. Strata inherit their parent's parties. See model.ts for why this is the
  // exposure map's reading rather than the banned painting-across-rows.
  //
  // Purely presentational and purely additive: it renders what it is given and
  // emits a selection. It never places, never merges, and never computes estate
  // truth — `bindingPotential` is this question's own minimum (delivery §4.2), NOT
  // an estate floor, and marker seals come from `evaluate()`. Pair it with
  // the fan-out card / the fill surface, which own the placement gestures and remain
  // the authoritative keyboard-complete path; the spokes here are a second,
  // equivalent affordance, not the only one.

  type Props = {
    question: Question;
    workbook: Workbook;
    parties: Party[];
    answers: Answer[];
    /** The unit the host is currently placing on; drawn heavier. */
    selected?: Target | null;
    /** Tap or Enter/Space on a spoke. Omit for a read-only wheel. */
    onSelect?: (target: Target) => void;
    /** Rendered width in px; the viewBox is fixed so text never rescales oddly. */
    size?: number;
    /** Draw the coral ring at the binding rung. Off for a plain progress read. */
    showBinding?: boolean;
    /** `evaluate().exposure`. Absent = no marker ring. */
    exposure?: ExposureEdge[];
    /** Override the auto-hide: the ring is hidden when every unit would show the
     * same parties, because then it is noise rather than signal. */
    showExposure?: boolean;
  };

  let {
    question,
    workbook,
    parties,
    answers,
    selected = null,
    onSelect,
    size = WHEEL_VIEWBOX.width,
    showBinding = true,
    exposure = [],
    showExposure,
  }: Props = $props();

  const CX = WHEEL_VIEWBOX.cx;
  const CY = WHEEL_VIEWBOX.cy;
  const HUB = WHEEL_VIEWBOX.hub;

  const model = $derived(questionWheelModel(workbook, parties, answers, question, exposure));
  const exposed = $derived(showExposure ?? (model.maxExposure > 0 && model.exposureInformative));
  const rings = $derived(exposed ? RINGS_EXPOSED : RINGS_PLAIN);
  const rim = $derived(rings[4]);
  // The label ring must clear the widest marker stack: a don't-know takes slot 0
  // (it belongs outside the ladder, not on a rung), served parties stack behind it.
  const stack = $derived(exposed ? model.maxMarkerStack : model.dontKnowTotal > 0 ? 1 : 0);
  const labelR = $derived(labelRadius(rim, stack));
  const angles = $derived(spokeAngles(model.units.length));
  const selectedKey = $derived(selected ? targetKey(selected) : null);

</script>

{#if model.units.length === 0}
  <p class="text-sm text-muted-foreground">
    This question reaches no unit in the estate — nothing to place.
  </p>
{:else}
  <svg
    width={size}
    viewBox={`0 0 ${WHEEL_VIEWBOX.width} ${WHEEL_VIEWBOX.height}`}
    role="img"
    class="max-w-full text-foreground"
    aria-label={`${question.text} — ${model.placed} of ${model.units.length - model.na} units placed`}
  >
    <title>{question.text}</title>
    <desc>{wheelSummary(model, exposed)}</desc>

    {#each rings as r (r)}
      <circle cx={CX} cy={CY} {r} fill="none" stroke="currentColor" stroke-width="0.5" class="text-border" />
    {/each}

    {#if showBinding && model.bindingPotential !== null}
      <circle
        cx={CX}
        cy={CY}
        r={ringRadius(rings, model.bindingPotential)}
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-dasharray="5 4"
        class="text-destructive"
      />
    {/if}

    {#each model.units as unit, i (unit.key)}
      <SpokeHit
        title={unitTitle(unit)}
        onActivate={onSelect ? () => onSelect(unit.target) : undefined}
      >
        <QuestionSpoke
          {unit}
          deg={angles[i]}
          active={unit.key === selectedKey}
          binding={isBinding(model, unit, showBinding)}
          {rings}
          {rim}
          {labelR}
          {exposed}
        />
      </SpokeHit>
    {/each}

    <circle cx={CX} cy={CY} r={HUB} fill="currentColor" class="text-background" />
    <circle cx={CX} cy={CY} r={HUB} fill="none" stroke="currentColor" stroke-width="0.5" class="text-border" />
    <text
      x={CX}
      y={CY - 2}
      text-anchor="middle"
      font-size="13"
      font-weight="500"
      fill="currentColor"
      class={model.bindingPotential === null ? 'text-muted-foreground' : 'text-foreground'}
    >
      {model.bindingPotential === null ? '—' : `SEAL-${model.bindingPotential}`}
    </text>
    <text x={CX} y={CY + 13} text-anchor="middle" font-size="11" fill="currentColor" class="text-muted-foreground">
      {model.unknowns > 0 ? `${model.unknowns} unknown${model.unknowns === 1 ? '' : 's'}` : 'binding'}
    </text>
  </svg>
{/if}

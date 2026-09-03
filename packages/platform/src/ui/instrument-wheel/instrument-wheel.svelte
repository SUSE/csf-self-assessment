<script lang="ts">
  import type { Answer, Party, Workbook } from '../../schema';
  import { chipAngles, placeLabels, CX, CY, RIM, WHEEL_VIEWBOX } from '../wheel';
  import ArcDivider from '../wheel/arc-divider.svelte';
  import MagnitudeRings from '../wheel/magnitude-rings.svelte';
  import WheelHub from '../wheel/wheel-hub.svelte';
  import { labelRadiusOf, FIGURE_HEIGHT } from './draw';
  import { instrumentReadings } from './readings';
  import ReadingsLedger from './readings-ledger.svelte';
  import WheelLegend from './wheel-legend.svelte';
  import WheelSpoke from './wheel-spoke.svelte';
  import {
    instrumentModel,
    instrumentSeals,
    type ChipSeal,
    type InstrumentChip,
  } from './model';

  // The Author's "instrument at a glance" (workbench overview). It wears the
  // MergeWheel's grammar — dimensions on the right arc, party TYPES on the left,
  // the whole-estate chip at 12 o'clock — but reads structure, not answers: a
  // spoke's length is the QUESTION-UNIT COUNT that will fan onto that chip, so a
  // busy dimension reaches the rim and a dimension no question touches is a red
  // stub at the hub. Beside the figure sit the counts that don't fit a spoke —
  // objectives, roles, strata, budget — every one derived from the definition
  // alone. Clicking a spoke inspects it — the spokes are inspector-aware themselves
  // (ui/inspector's session), so nothing between here and the shell forwards a
  // handler for it, and a reading row inspects itself the same way.
  //
  // LAYOUT: figure and ledger are one wrapping flex row, sized by `basis` + `grow`
  // rather than by breakpoints. They sit side by side whenever the two natural
  // widths fit, and the ledger drops under the figure when they don't — so the
  // composition follows the space the panel actually has (which the collapsible
  // right rail changes without any viewport change at all), not a viewport class.

  type Props = {
    workbook: Workbook;
    /** A loaded assessment's answers (facilitator only). When non-empty the wheel
     * layers a per-spoke SEAL marker — the lowest selected seal on that axis — over
     * the structural bars. The Author app passes nothing and stays structural. */
    answers?: Answer[];
    /** Concrete declared parties, needed to roll party-axis answers up to their
     * party TYPE (the arc the wheel draws). Only read when `answers` is non-empty. */
    parties?: Party[];
  };
  let { workbook, answers = [], parties = [] }: Props = $props();

  const model = $derived(instrumentModel(workbook));
  const spokes = $derived(chipAngles(model.chips));
  const s = $derived(model.stats);
  const readings = $derived(instrumentReadings(s));

  // Results overlay (facilitator): the answered SEALs, rolled up to each spoke.
  // Null in the Author app (no answers) — every `reflecting` branch below then
  // no-ops, so the wheel stays the structural, hue-free instrument it always was.
  const seals = $derived(answers.length > 0 ? instrumentSeals(workbook, parties, answers) : null);
  const reflecting = $derived(seals !== null);
  // The chip's seal reading, or null when not reflecting / no unit fans onto it.
  function sealFor(chip: InstrumentChip): ChipSeal | null {
    const cs = seals?.get(chip.kind + ':' + chip.key);
    return cs && cs.total > 0 ? cs : null;
  }
  const coverage = $derived.by(() => {
    if (!seals) return null;
    let covered = 0;
    for (const cs of seals.values()) covered += cs.covered;
    // Report against the wheel's OWN fan-out count — the same `totalUnits` the base
    // aria names as "answer units" — so the two figures share one denominator
    // instead of the structural 75 disagreeing with an answer-expanded count.
    return { covered, total: model.totalUnits };
  });

  // Labels sit just outside the rim, then get de-collided per side: the right arc
  // packs every dimension into a half-circle, so toward the 12 and 6 o'clock poles
  // their labels would stack. `placeLabels` spreads the crowded anchors apart
  // vertically with the least movement (the equator stays put) and keeps each
  // column within the viewBox.
  const labels = $derived(
    placeLabels(
      spokes.map(({ chip, deg }) => ({ deg, r: labelRadiusOf(chip) })),
      CX,
      CY,
      // Single-line labels need far less vertical air than the old two-line block,
      // so they pack near their true spoke angle. maxSpan still fits the viewBox.
      { minGap: 22, maxSpan: WHEEL_VIEWBOX.height - 72 },
    ),
  );
</script>

<!-- Left-aligned, not centred: the overview's other panels start their content at
     the stage's left edge, and centring this pair inside a wide panel put the
     legend 250px in from that edge — one page with two left margins. Trailing
     space at the very widest sizes is the right trade, and it is mostly
     hypothetical: the right rail is open by default, which is exactly the width
     this pair is sized to fill. -->
<div class="flex flex-wrap items-start gap-x-10 gap-y-8">
  <!-- The figure: grows into the space it is given, and stops at the width its 13px
       labels are drawn for (past 48rem the type scales up with the viewBox and the
       plot reads as a poster).
       The 34rem basis is what decides the reflow, and it is chosen for the FIGURE's
       sake: an SVG scales its type with its width, so a wheel squeezed into a
       shared line renders those labels at 9px. Asking for 34rem means the pair
       breaks to two lines before that happens, and a wheel alone on its line gets
       the full 48rem. -->
  <div class="flex min-w-0 max-w-3xl grow basis-[34rem] flex-col gap-3">
    <!-- Below 30rem there is no arrangement left that keeps the labels legible, so
         the figure stops shrinking and scrolls instead of dissolving. -->
    <div class="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WHEEL_VIEWBOX.width} ${FIGURE_HEIGHT}`}
        role="img"
        class="w-full min-w-[30rem] text-foreground"
        aria-label={`Instrument shape — ${s.questions} questions fanning to ${model.totalUnits} answer units across ${s.dimensions} dimensions and ${s.partyTypes} party types` +
          (coverage ? `; ${coverage.covered} of ${coverage.total} answer units answered so far, each spoke marked with its lowest selected SEAL` : '')}
      >
        <title>Instrument at a glance</title>
        <desc>
          Dimension spokes on the right and the whole-estate chip at the top are length-scaled by
          how many question-units land on them; a red stub is a dimension no question reaches yet.
          Party types on the left are fixed branches to a node (a taxonomy, not a magnitude — every
          type answers the same party questions). {s.questions} questions, {model.totalUnits} answer
          units in all.
        </desc>

        <MagnitudeRings rim={RIM} />
        <ArcDivider rim={RIM} />

        {#each spokes as entry, i (entry.chip.kind + ':' + entry.chip.key)}
          <WheelSpoke
            chip={entry.chip}
            deg={entry.deg}
            label={labels[i]}
            maxCount={model.maxCount}
            seal={sealFor(entry.chip)}
          />
        {/each}

        <!-- the hub: the instrument's headline size -->
        <WheelHub>
          <text x={CX} y={CY - 1} text-anchor="middle" font-size="15" font-weight="600" fill="currentColor" class="text-foreground">
            {s.questions}
          </text>
          <text x={CX} y={CY + 12} text-anchor="middle" font-size="10" fill="currentColor" class="text-muted-foreground">
            {s.questions === 1 ? 'question' : 'questions'}
          </text>
        </WheelHub>
      </svg>
    </div>

    <WheelLegend {reflecting} />
  </div>

  <!-- The readings: a column the eye runs down, capped at the measure its rows
       read at — beyond ~30rem a row's count and its qualifier drift to opposite
       ends of a band too wide to read as one pair. -->
  <ReadingsLedger
    {readings}
    class="min-w-0 max-w-[30rem] grow basis-[20rem]"
  />
</div>

<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  import { activateOnKey, polar, CX, CY, HUB, RIM, type PlacedLabel } from '../wheel';
  import HitLane from '../wheel/hit-lane.svelte';
  import CountBar from './count-bar.svelte';
  import GapStub from './gap-stub.svelte';
  import PartyBranch from './party-branch.svelte';
  import SpokeLabel from './spoke-label.svelte';
  import { chipTitle, labelRadiusOf } from './draw';
  import type { ChipSeal, InstrumentChip } from './model';
  // Deep imports: the Inspector's subject union names this wheel's chip kinds, so
  // going through its barrel would be a cycle.
  import { getInspector } from '../inspector/inspector.svelte';
  import type { InspectSelection } from '../inspector/subject';

  // One axis of the instrument wheel: its faint full-length track, the mark that
  // reads the chip (a length-scaled count bar, a fixed party branch, or a dashed
  // gap stub), and the label outside the rim. Internal to instrument-wheel.
  //
  // The slice is INSPECTOR-AWARE: wherever an app runs an inspection session the
  // whole slice is a button that reports its chip to the rail (the stage stays on
  // the overview), and the axis inks itself while the rail reads it. In an app with
  // no session there is nothing to report to, so the slice is plain geometry — the
  // same degradation as an omitted handler, and the reason this needs no prop from
  // the wheel, the overview, the workbench or the shell.
  type Props = {
    chip: InstrumentChip;
    deg: number;
    label: PlacedLabel;
    maxCount: number;
    /** The chip's seal reading (facilitator only), or null when structural. */
    seal: ChipSeal | null;
  };
  let { chip, deg, label, maxCount, seal }: Props = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({
    kind: 'instrument-chip',
    chipKind: chip.kind,
    key: chip.key,
  });
  const showing = $derived(inspector?.isShowing(selection) ?? false);

  const title = $derived(chipTitle(chip));
  const hubPt = $derived(polar(CX, CY, HUB, deg));
  const rimPt = $derived(polar(CX, CY, RIM, deg));

  function inspect(): void {
    inspector?.show(selection);
  }

  // Spread rather than conditional attributes: the group is a button only where a
  // session exists, and a spread keeps that as ONE code path instead of two
  // near-identical <g> branches — the a11y contract is satisfied as a set, here.
  const interactive = $derived<SVGAttributes<SVGGElement>>(
    inspector
      ? {
          role: 'button',
          tabindex: 0,
          'aria-label': title,
          'aria-pressed': showing,
          class:
            'cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          onclick: inspect,
          onkeydown: (event: KeyboardEvent) => activateOnKey(event, inspect),
        }
      : {},
  );
</script>

<g {...interactive}>
  <title>{title}</title>

  {#if inspector}
    <HitLane {deg} reach={labelRadiusOf(chip) + 18} />
  {/if}

  <!-- Faint full-length track so an empty spoke still shows its axis, and where
       "the rail is reading THIS spoke" shows (heavier, foreground-inked). An empty
       spoke keeps its alarm hue even while selected: the 12px dashed stub alone
       read as a short spoke rather than a finding, and the finding outranks the
       selection. One colour utility per element, never a base class a later
       utility is expected to beat. -->
  <line
    x1={hubPt[0]}
    y1={hubPt[1]}
    x2={rimPt[0]}
    y2={rimPt[1]}
    stroke="currentColor"
    stroke-width={chip.empty ? 1 : showing ? 1.5 : 0.75}
    class={chip.empty ? 'text-destructive/45' : showing ? 'text-foreground' : 'text-border'}
  />

  {#if chip.kind === 'party'}
    <PartyBranch {chip} {deg} />
  {:else if chip.empty}
    <GapStub {deg} />
  {:else}
    <CountBar {chip} {deg} {maxCount} />
  {/if}

  <!-- Strata are read off the label's `◇N` suffix, not drawn on the spoke: a
       stratum is a count with no radial position, so glyphs spaced along the axis
       implied a magnitude the data does not carry. The seal reading rides the
       label for the same reason. -->
  <SpokeLabel {chip} {label} {seal} />
</g>

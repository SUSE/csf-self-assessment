import type { Component } from 'svelte';
import type { TileDef } from '../../analytics';
import type { TileProps } from './tile-props';
import { CredibilityTile } from './tiles/credibility-tile';
import { DontKnowTile } from './tiles/dont-know-tile';
import { EstateWheelTile } from './tiles/estate-wheel-tile';
import { EvidenceTile } from './tiles/evidence-tile';
import { ExposureTile } from './tiles/exposure-tile';
import { FloorTile } from './tiles/floor-tile';
import { HeatDimensionTile } from './tiles/heat-dimension-tile';
import { HeatPartyTile } from './tiles/heat-party-tile';
import { HeatRoleTile } from './tiles/heat-role-tile';
import { HeatStratumTile } from './tiles/heat-stratum-tile';
import { ObjectivesTile } from './tiles/objectives-tile';
import { ScoreTile } from './tiles/score-tile';
import { SecondLookTile } from './tiles/second-look-tile';
import { StaircaseTile } from './tiles/staircase-tile';
import { WhatsLeftTile } from './tiles/whats-left-tile';

export type TileEntry = { def: TileDef; component: Component<TileProps> };

/**
 * Tiles are code, not data (analytics invariant #6): a typed array of
 * components. No layout persistence, no configuration format, ever.
 *
 * `width` / `grow` / `min` are claims about a tile's CONTENT, not layout
 * preferences (tile-width.ts). Read them that way when changing one:
 *
 * - `half` is what the four heat tiles share, because they are one component on
 *   four axes and placing them as anything but equals would rank them. `floor`
 *   and `score` pair the same way: the two numbers the product refuses to
 *   collapse (product principle #1) are declared equal and read as equal.
 * - `full` is for a band whose answer runs across the row — an owner ledger, a
 *   ranked list of moves. No tile claims it today.
 * - `grow` is for a body that can spend surplus width on more content, not on
 *   more air. `floor` carries a level name and a paragraph under its number, so
 *   it can; a figure never can, and the type forbids it saying otherwise.
 * - `min` is measured, not preferred. The four heat tiles share one floor rather
 *   than each taking its own from its pivot count: with `heat-dimension`'s
 *   eleven columns set higher than the rest, a narrowing row broke the set into
 *   1 / 2 / 1 — four equals reflowing as three unequal lines. A set wraps as a
 *   set, so the binding floor is the set's floor.
 *
 * No tile currently declares `sixth`. It stayed in the vocabulary because the
 * module needs a unit, but the first attempt at this registry spent it on
 * `floor` and `score` and it was wrong — 187px is a sliver for a number that
 * carries a sentence. Reach for it only for something genuinely wordless.
 */
export const TILES: readonly TileEntry[] = [
  {
    def: {
      id: 'floor',
      section: 'standing',
      title: 'Floor',
      asks: 'What are we?',
      width: 'third',
      grow: true,
      // Pressing the reading puts the SEAL ladder in the Inspector, so there is no
      // bigger version of this tile to show.
      maximises: false,
    },
    component: FloorTile,
  },
  {
    def: {
      id: 'score',
      section: 'standing',
      title: 'Score',
      asks: 'How do we rank, given we clear the floor?',
      width: 'third',
      grow: true,
      // The gauge, its caption and the open-material note are the whole reading;
      // the caveat about attainable points that used to be maximise-only now
      // renders in the grid, so the control had nothing left under it.
      maximises: false,
    },
    component: ScoreTile,
  },
  {
    def: {
      id: 'objectives',
      section: 'standing',
      title: 'Objectives',
      asks: 'Where does weakness coincide with leverage?',
      // Not `full`, though it starts a line of its own: the ring is capped at
      // `max-h-[320px]` (objectives-ring.svelte), so past this width it stops
      // growing and floats in its own air while the caption stretches to a
      // 180-character measure. Symmetric air OUTSIDE the card beats dead air
      // inside it.
      width: 'twoThirds',
      figure: true,
      // The ring is the whole reading: every wedge is labelled with its
      // objective's name and `20% · SEAL-1`, and its hover line adds the score.
      // The table this used to gain maximised restated all four columns of that,
      // so the control only enlarged the figure.
      maximises: false,
    },
    component: ObjectivesTile,
  },
  {
    def: {
      id: 'whats-left',
      section: 'standing',
      title: "What's left",
      asks: 'What is still unanswered, and whose job is it?',
      // Sits beside `objectives`, filling the two columns the capped ring leaves
      // free rather than starting a band of its own on the next line. At this
      // share the body is a column, not a band: the rail and the owner ledger
      // stack (whats-left-tile.svelte) and the ledger stays one column, so the
      // ring's height is what the owners are read down.
      width: 'third',
      grow: true,
      // Measured 98px empty and 179px populated at this share, in a row the
      // capped ring sets to ~514px: what it has to say is bounded (a count, a
      // bar, the owners), so it hugs rather than spending 335px on air inside
      // the card.
      hug: true,
      // An owner chip inspects its own backlog, so nothing is left to maximise into.
      maximises: false,
    },
    component: WhatsLeftTile,
  },
  {
    def: {
      id: 'credibility',
      section: 'standing',
      title: 'Credibility',
      asks: 'How was this file produced, and by whom?',
      // Read under `whats-left`, in the column the capped ring leaves free:
      // how the file was produced qualifies the numbers beside it, and the
      // alternative was a full-width band under a heading of its own with the
      // column above it empty. Its width is the column's — `whats-left`'s.
      width: 'third',
      stack: true,
      // The body summarises rather than lists — a dial that folds its own tail, two
      // ratios. Every mark on it opens the rail instead: a slice inspects that
      // contributor's standing answers, a ratio row the units its bar measured. So
      // nothing is left for a second size to show.
      maximises: false,
    },
    component: CredibilityTile,
  },
  {
    def: {
      id: 'heat-dimension',
      section: 'weakness',
      title: 'Weakness by dimension',
      asks: 'Which part of the estate is weak?',
      width: 'half',
      grow: true,
      min: 26,
      tints: true,
      // A cell press inspects the answers behind it; row labels are spelled out at
      // every width now, so nothing is left for a maximised grid to add.
      maximises: false,
    },
    component: HeatDimensionTile,
  },
  {
    def: {
      id: 'heat-stratum',
      section: 'weakness',
      title: 'Weakness by stratum',
      asks: 'Is the weakness at one layer everywhere?',
      width: 'half',
      grow: true,
      min: 26,
      tints: true,
      // A cell press inspects the answers behind it; row labels are spelled out at
      // every width now, so nothing is left for a maximised grid to add.
      maximises: false,
    },
    component: HeatStratumTile,
  },
  {
    def: {
      id: 'heat-party',
      section: 'weakness',
      title: 'Weakness by party',
      asks: 'Which provider drags us down?',
      width: 'half',
      grow: true,
      min: 26,
      tints: true,
      // A cell press inspects the answers behind it; row labels are spelled out at
      // every width now, so nothing is left for a maximised grid to add.
      maximises: false,
    },
    component: HeatPartyTile,
  },
  {
    def: {
      id: 'heat-role',
      section: 'weakness',
      title: 'Weakness by role',
      asks: 'Whose answers pin the floor?',
      width: 'half',
      grow: true,
      min: 26,
      tints: true,
      // A cell press inspects the answers behind it; row labels are spelled out at
      // every width now, so nothing is left for a maximised grid to add.
      maximises: false,
    },
    component: HeatRoleTile,
  },
  {
    def: {
      id: 'staircase',
      section: 'action',
      title: 'Staircase',
      asks: 'What do we fix to move up?',
      // A figure, since the worklist left for the rail: the treads cap at 384px
      // (staircase-tile.svelte), so a wider share only scales the drawing.
      width: 'third',
      figure: true,
      // A tread press inspects the answers pinning that rung, which is everything a
      // maximised copy of the climb used to print.
      maximises: false,
    },
    component: StaircaseTile,
  },
  {
    def: {
      id: 'exposure',
      section: 'action',
      title: 'Exposure',
      asks: 'Who holds a kill switch, and who is under too much of us?',
      width: 'twoThirds',
      figure: true,
    },
    component: ExposureTile,
  },
  {
    def: {
      id: 'dont-know',
      section: 'gaps',
      title: "Don't-know",
      asks: "What do we admit we don't know?",
      width: 'third',
      grow: true,
      // Two paragraphs whatever the estate admits — the units are in the rail — so the
      // card ends at them rather than filling `evidence`'s ledger height.
      hug: true,
      // The admitted units are a second READING, not a second size: they are in the
      // rail (ui/inspector/dont-know-inspection), so there is nothing to maximise.
      maximises: false,
    },
    component: DontKnowTile,
  },
  {
    def: {
      id: 'evidence',
      section: 'gaps',
      title: 'Evidence',
      asks: 'Could we defend this to a reviewer?',
      width: 'twoThirds',
      grow: true,
      // The undefended list is a second READING, not a second size: it is in the rail
      // (ui/inspector/evidence-inspection), grouped by objective.
      maximises: false,
    },
    component: EvidenceTile,
  },
  {
    def: {
      id: 'worth-a-second-look',
      section: 'gaps',
      title: 'Worth a second look',
      asks: 'What contradicts itself?',
      // Five dials in a band, so the body is bounded on both axes: it takes the width
      // the dials need and no more, and the remainder becomes symmetric air outside
      // the card rather than 240px of air around each 64px ring.
      width: 'twoThirds',
      // Five dials at their 6rem basis. Below this the band breaks into two lines and
      // the five checks stop reading as one set.
      min: 30,
      hug: true,
      // The two facts, the question and the units are a second READING, not a second
      // size: they are in the rail (ui/inspector/second-look-inspection).
      maximises: false,
    },
    component: SecondLookTile,
  },
  {
    def: {
      id: 'estate-wheel',
      section: 'shape',
      title: 'Estate wheel',
      asks: 'Where are we weakest, in one frame?',
      width: 'twoThirds',
      figure: true,
      tints: true,
      // A spoke press opens its weakest links in the Inspector, so the wheel has no
      // second reading to gain at a larger size.
      maximises: false,
    },
    component: EstateWheelTile,
  },
];

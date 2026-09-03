import { describe, expect, it } from 'vitest';
import { credibilityTile } from './credibility';
import { dontKnowTile } from './dont-know';
import { estateWheelTile } from './estate-wheel';
import { evidenceTile } from './evidence';
import { exposureTile } from './exposure';
import { heatTile } from './heat-views';
import type { HeatAxisId } from './heat-axes';
import { objectivesTile } from './objectives';
import { ribbonModel } from './ribbon';
import { secondLookTile } from './second-look';
import { staircaseTile } from './staircase';
import { floorTile, scoreTile } from './standing';
import { SUBJECT_EMPTY, SUBJECT_NO_DIMENSIONS } from './subjects-fixture';
import { TILE_IDS } from './tiles';
import { whatsLeftTile } from './whats-left';

// Registry-complete empty-state oracle (analytics §2.5): over the
// workbook-assessment as distributed with nothing answered, every one of the
// fifteen tiles either has content or names why it has none. Vendor
// recommendations are not tiles any more — their own empty states are asserted in
// recommendations.test.ts.

const { result, workbook, parties } = SUBJECT_EMPTY;

function reasonOf(tile: string, kind: string, expected: string, reason: string | undefined): string {
  if (kind !== expected || reason === undefined) {
    throw new Error(`${tile}: expected the empty variant '${expected}', got '${kind}'`);
  }
  return reason;
}

function heatReason(axis: HeatAxisId): string {
  const tile = heatTile(result, workbook, parties, axis);
  return reasonOf(`heat-${axis}`, tile.kind, 'empty', tile.kind === 'empty' ? tile.reason : undefined);
}

const staircase = staircaseTile(result, workbook, parties);
const exposure = exposureTile(result, workbook);
const dontKnow = dontKnowTile(result, workbook, parties);
const evidence = evidenceTile(result, workbook, parties);
const wheel = estateWheelTile(result, workbook, parties);
const credibility = credibilityTile(result, workbook);

const REASONS: Record<string, string> = {
  'heat-dimension': heatReason('dimension'),
  'heat-stratum': heatReason('stratum'),
  'heat-party': heatReason('party'),
  'heat-role': heatReason('role'),
  staircase: reasonOf(
    'staircase',
    staircase.kind,
    'not-assessed',
    staircase.kind === 'not-assessed' ? staircase.reason : undefined,
  ),
  exposure: reasonOf(
    'exposure',
    exposure.kind,
    'empty',
    exposure.kind === 'empty' ? exposure.reason : undefined,
  ),
  'dont-know': reasonOf(
    'dont-know',
    dontKnow.kind,
    'none',
    dontKnow.kind === 'none' ? dontKnow.reason : undefined,
  ),
  evidence: reasonOf(
    'evidence',
    evidence.kind,
    'empty',
    evidence.kind === 'empty' ? evidence.reason : undefined,
  ),
  'estate-wheel': reasonOf(
    'estate-wheel',
    wheel.kind,
    'empty',
    wheel.kind === 'empty' ? wheel.reason : undefined,
  ),
  credibility: reasonOf(
    'credibility',
    credibility.swept.kind,
    'none',
    credibility.swept.kind === 'none' ? credibility.swept.reason : undefined,
  ),
};

const POPULATED_ON_EMPTY = [
  'floor',
  'score',
  'objectives',
  'whats-left',
  'worth-a-second-look',
];

describe('every tile over SUBJECT_EMPTY (analytics-S7)', () => {
  it('the ten tiles with nothing to show name why', () => {
    expect(REASONS).toEqual({
      'heat-dimension': 'Nothing asserted yet — this grid fills in as answers land.',
      'heat-stratum':
        'No dimension is split into strata yet — this grid fills in once an answer lands on a layer.',
      'heat-party': 'Nothing asserted yet — this grid fills in as answers land.',
      'heat-role': 'Nothing asserted yet — this grid fills in as answers land.',
      staircase: 'Not yet assessed — the climb appears once a material gating answer lands.',
      exposure:
        'No third party serves a declared dimension yet — name what each party serves when you seed the roster.',
      'dont-know': "A blank is not a don't-know; it is still open.",
      evidence: 'No gating answer yet — evidence coverage appears once an answer sets the floor.',
      'estate-wheel':
        'Nothing asserted yet — the wheel draws itself from answered material answers, so it appears once the first one is recorded.',
      credibility: 'Nothing answered yet — a gesture share needs an answer to describe.',
    });
    expect(credibility.ledger.kind).toBe('unlanded');
  });

  it('the registry is covered: every tile is either empty-with-a-reason or populated', () => {
    expect([...Object.keys(REASONS), ...POPULATED_ON_EMPTY].sort()).toEqual([...TILE_IDS].sort());
  });

  it('the five that still render show absence, never a zero', () => {
    expect(floorTile(result, workbook).standing.kind).toBe('not-assessed');
    expect(scoreTile(result).standing.kind).toBe('not-assessed');

    const objectives = objectivesTile(result, workbook);
    expect(objectives.arcs).toHaveLength(workbook.objectives.length);
    expect(objectives.arcs.filter((arc) => arc.standing.kind === 'asserted')).toEqual([]);
    expect(
      objectives.arcs.filter((arc) => arc.standing.kind === 'informational').map((arc) => arc.id),
    ).toEqual(['SOV-8']);

    expect(whatsLeftTile(result, workbook, parties).open).toBe(result.units.total);

    const secondLook = secondLookTile(result, workbook, parties);
    expect(secondLook.kind).toBe('flagged');
    if (secondLook.kind === 'flagged') {
      expect(secondLook.checks).toHaveLength(1);
      expect(secondLook.checks[0].id).toBe('unserved-dimension');
    }
  });

  it('the ribbon reads the empty base', () => {
    expect(ribbonModel(result)).toEqual({
      unitsPlaced: 0,
      unitsTotal: 57,
      dontKnow: 0,
      parties: 1,
      contributors: 0,
      floor: null,
    });
  });
});

// instrument-S5 (invariant #13): the EC calculator declares NO dimensions, so
// the three dimension-driven tiles must say so — and the tiles that are already
// honest with zero dimensions must keep rendering without inventing an axis.
describe('every dimension-driven tile over SUBJECT_NO_DIMENSIONS (instrument-S5)', () => {
  const nd = SUBJECT_NO_DIMENSIONS;

  it('the dimension heat tile names the missing axis', () => {
    expect(heatTile(nd.result, nd.workbook, nd.parties, 'dimension')).toEqual({
      kind: 'empty',
      axis: 'dimension',
      reason:
        'This workbook declares no dimensions — there is no dimension axis to pivot on, and none is invented.',
    });
  });

  it('the stratum heat tile names the missing layers', () => {
    expect(heatTile(nd.result, nd.workbook, nd.parties, 'stratum')).toEqual({
      kind: 'empty',
      axis: 'stratum',
      reason:
        'This workbook declares no dimensions, so there are no layers to split — nothing is invented here.',
    });
  });

  it('the exposure tile has no edges to draw', () => {
    expect(exposureTile(nd.result, nd.workbook)).toEqual({
      kind: 'empty',
      reason:
        'This workbook declares no dimensions, so there is nothing for a party to serve — the exposure map has no edges to draw.',
    });
  });

  it('the already-honest surfaces still render and invent nothing', () => {
    const secondLook = secondLookTile(nd.result, nd.workbook, nd.parties);
    const checkIds = secondLook.kind === 'flagged' ? secondLook.checks.map((c) => c.id) : [];
    expect(checkIds).not.toContain('unserved-dimension');
    expect(checkIds).not.toContain('hidden-layer');

    const wheel = estateWheelTile(nd.result, nd.workbook, nd.parties);
    expect(wheel.kind).toBe('wheel');
    expect(wheel.kind === 'wheel' ? wheel.spokes.map((s) => s.key) : []).toEqual([
      'estate:assessment',
    ]);

    expect(heatTile(nd.result, nd.workbook, nd.parties, 'role').kind).toBe('grid');
    expect(heatTile(nd.result, nd.workbook, nd.parties, 'party').kind).toBe('grid');
  });
});

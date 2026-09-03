import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from '../schema';
import { evaluate } from '../score-engine';
import { RANK, runOn } from '../score-engine/fixtures';
import { floorTile, scoreTile } from './standing';

const alex = AssessmentSchema.parse(
  JSON.parse(
    readFileSync(new URL('../../../../assessment/partial-Alex.json', import.meta.url), 'utf8'),
  ),
);
const rosterA = [...alex.parties, ...(alex.partiesAdded ?? [])];
const A = evaluate(alex.workbook, { ...alex, parties: rosterA });
const B = evaluate(alex.workbook, {
  ...alex,
  parties: [
    ...rosterA,
    { id: 'northstar-edge', name: 'Northstar Edge Networks', type: 'service-provider', serves: ['edge'] },
  ],
});

describe('floorTile', () => {
  it('reads the floor with its authored level', () => {
    expect(floorTile(A, alex.workbook).standing).toEqual({
      kind: 'sealed',
      seal: 1,
      name: 'Jurisdictional Sovereignty',
      description:
        'EU law formally applies with limited practical enforceability; control can still be overridden from outside the EU.',
    });
    expect(floorTile(A, alex.workbook).unknowns).toBe(1);
  });

  it('an estate with no gating answer has no floor, not SEAL-0', () => {
    const tile = floorTile(
      { ...A, overall: { ...A.overall, floor: null, unknowns: [] } },
      alex.workbook,
    );
    expect(tile.standing).toEqual({ kind: 'not-assessed' });
    expect(tile.unknowns).toBe(0);
  });
});

describe('scoreTile', () => {
  it('reads the score and what could still move it', () => {
    const tile = scoreTile(A);
    expect(tile.standing.kind).toBe('scored');
    if (tile.standing.kind !== 'scored') throw new Error('expected a scored standing');
    expect(tile.standing.score).toBeCloseTo(51.66411093523282, 6);
    expect(tile.openScoring).toBe(0);
    expect(tile.openNote).toMatch(/^Every scoring unit is answered/);
    expect(scoreTile(B).openScoring).toBe(6);
    expect(scoreTile(B).openNote).toMatch(/^6 scoring units are still unanswered/);
  });

  it('counts a ranking unit as scoring (instrument-S4)', () => {
    const tile = scoreTile(runOn(RANK, []));
    expect(tile.openScoring).toBe(2);
    expect(tile.openNote).toBe(
      '2 scoring units are still unanswered — answering them can only move this number up.',
    );
  });

  it('says why a rank is not a floor, and carries the floor it is painted in', () => {
    expect(scoreTile(A).caption).toBe('Ranks above the floor — never a substitute for it.');
    expect(scoreTile(A).floor).toBe(1);
    // No gating answer is not SEAL-0: there is no seal to paint the arc in.
    expect(scoreTile({ ...A, overall: { ...A.overall, floor: null } }).floor).toBeNull();
  });

  it('nothing scoring answered is not a score of zero', () => {
    const tile = scoreTile({ ...A, overall: { ...A.overall, score: null } });
    expect(tile.standing).toEqual({ kind: 'not-assessed' });
    // Absence draws no gauge at all, which is not a gauge reading zero.
    expect(tile.caption).toMatch(/^Nothing scoring answered yet/);
  });
});

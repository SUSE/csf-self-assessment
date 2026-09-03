import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from '../schema';
import { SUBJECT_A, SUBJECT_C, SUBJECT_ONE } from '../analytics/subjects-fixture';
import { evaluate } from './index';

// The landed estates come from `subjects-fixture` — the one place the two
// landings are built. Rebuilding them here drifts from every other oracle.
// Alex's raw partial is still read directly, because `B` re-evaluates it over a
// roster this fixture does not carry.
const read = (file: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../assessment/${file}`, import.meta.url)), 'utf8'));

const alex = AssessmentSchema.parse(read('partial-Alex.json'));

const { result: A, parties: rosterA } = SUBJECT_A;

const NORTHSTAR = {
  id: 'northstar-edge',
  name: 'Northstar Edge Networks',
  type: 'service-provider',
  serves: ['edge'],
};
const B = evaluate(alex.workbook, { ...alex, parties: [...rosterA, NORTHSTAR] });

const ALEX_LANDED = SUBJECT_ONE.result;
const C = SUBJECT_C.result;

describe('unit-grain coverage', () => {
  it('counts units at unit grain, never per question', () => {
    expect(A.units).toEqual({ total: 81, answered: 74, dontKnow: 1, na: 6, unanswered: 0 });
    expect([A.overall.answered, A.overall.total]).toEqual([28, 35]);
  });

  it('projects one fact per placed unit and leaves the open ones open', () => {
    expect(A.facts).toHaveLength(81);
    expect(A.openUnits).toEqual([]);
    expect(B.units).toEqual({ total: 87, answered: 74, dontKnow: 1, na: 6, unanswered: 6 });
    expect(B.facts).toHaveLength(81);
  });

  it('unanswered is exactly the open units, on every subject', () => {
    for (const result of [A, B, C]) {
      expect(result.units.unanswered).toBe(result.openUnits.length);
      expect(
        result.units.answered + result.units.dontKnow + result.units.na + result.units.unanswered,
      ).toBe(result.units.total);
      expect(result.facts).toHaveLength(result.units.total - result.units.unanswered);
    }
  });

  it('names every open unit with its question, objective and role', () => {
    expect(B.openUnits.map((u) => [u.questionId, u.objectiveId, u.role, u.target])).toEqual([
      ['SOV-1.decisive-authority', 'SOV-1', 'LEG', { kind: 'party', party: 'northstar-edge' }],
      ['SOV-1.change-of-control', 'SOV-1', 'LEG', { kind: 'party', party: 'northstar-edge' }],
      ['SOV-2.compellability', 'SOV-2', 'LEG', { kind: 'party', party: 'northstar-edge' }],
      ['SOV-2.enforceability', 'SOV-2', 'LEG', { kind: 'party', party: 'northstar-edge' }],
      ['SOV-5.audit-rights', 'SOV-5', 'PROC', { kind: 'party', party: 'northstar-edge' }],
      ['SOV-7.privileged-access', 'SOV-7', 'SEC', { kind: 'party', party: 'northstar-edge' }],
    ]);
    expect(B.openUnits.every((u) => u.materiality === 'material')).toBe(true);
  });

  it('carries the facets every heat axis groups by', () => {
    const chips = A.facts.find(
      (f) => f.stratum === 'chips' && f.questionId === 'SOV-4.withdrawal-survival',
    );
    expect(chips?.dimension).toBe('compute');
    expect(chips?.party).toBeNull();
    const party = A.facts.find((f) => f.party === 'acme-cloud');
    expect(party?.dimension).toBeNull();
    expect(party?.stratum).toBeNull();
    expect(A.facts.filter((f) => f.materiality === 'material')).toHaveLength(77);
  });

  it('reads the estate as it lands', () => {
    expect(ALEX_LANDED.units).toEqual({ total: 81, answered: 74, dontKnow: 1, na: 6, unanswered: 0 });
    expect(ALEX_LANDED.overall.floor).toBe(1);
    expect(ALEX_LANDED.overall.score).toBeCloseTo(51.66411093523282, 6);
    expect(ALEX_LANDED.declaredParties).toHaveLength(4);

    expect(C.units).toEqual({ total: 96, answered: 84, dontKnow: 1, na: 8, unanswered: 3 });
    expect(C.overall.floor).toBe(0);
    expect(C.overall.score).toBeCloseTo(41.49137047163364, 6);
    expect(C.declaredParties).toHaveLength(6);
    expect(C.openUnits.map((u) => u.questionId)).toEqual([
      'SOV-1.change-of-control',
      'SOV-2.enforceability',
      'SOV-5.audit-rights',
    ]);
    expect(C.openUnits.every((u) => u.target.kind === 'party' && u.target.party === 'northstar-edge')).toBe(
      true,
    );
  });
});

describe('the gating set and the floor holes', () => {
  it('exposes every gating answer, flat', () => {
    expect(A.gating).toHaveLength(60);
    expect(A.credibility.evidenceCoverage).toEqual({ evidenced: 8, total: 60 });
    expect(C.gating).toHaveLength(71);
    expect(C.credibility.evidenceCoverage).toEqual({ evidenced: 9, total: 71 });
  });

  it('is exactly the set evidence coverage counts', () => {
    for (const result of [A, B, C]) {
      expect(result.gating.length).toBe(result.credibility.evidenceCoverage.total);
      expect(result.gating.filter((b) => b.evidence !== null).length).toBe(
        result.credibility.evidenceCoverage.evidenced,
      );
    }
  });

  it('is the staircase plus the SEAL-4 rungs the staircase drops', () => {
    for (const result of [A, B, C]) {
      expect(result.staircase.flatMap((s) => s.binding).length).toBe(
        result.gating.filter((b) => b.seal < 4).length,
      );
    }
    const atFour = [
      ['SOV-2.compellability', null, 'siliconware'],
      ['SOV-2.enforceability', null, 'siliconware'],
      ['SOV-3.key-custody', 'storage', null],
      ['SOV-7.privileged-access', null, 'siliconware'],
    ];
    expect(A.gating.filter((b) => b.seal === 4).map((b) => [b.questionId, b.dimension, b.party])).toEqual(
      atFour,
    );
    expect(C.gating.filter((b) => b.seal === 4).map((b) => [b.questionId, b.dimension, b.party])).toEqual(
      atFour,
    );
  });

  it('names the floor holes at unit grain, with each unit target', () => {
    expect(A.floorHoles).toEqual([
      {
        questionId: 'SOV-5.hardware-provenance',
        objectiveId: 'SOV-5',
        role: 'PROC',
        target: { kind: 'dimension', dimension: 'network' },
      },
    ]);
    expect(C.floorHoles).toEqual([
      {
        questionId: 'SOV-2.enforceability',
        objectiveId: 'SOV-2',
        role: 'LEG',
        target: { kind: 'party', party: 'acme-eu' },
      },
    ]);
  });

  it('is the same set overall.unknowns records deduped to question ids', () => {
    for (const result of [A, B, C]) {
      expect([...new Set(result.floorHoles.map((h) => h.questionId))]).toEqual(result.overall.unknowns);
    }
  });
});

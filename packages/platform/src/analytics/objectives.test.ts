import { describe, expect, it } from 'vitest';
import { alexRaw } from '../test-fixtures';
import { AssessmentSchema, type Seal, type Workbook } from '../schema';
import { evaluate, type EngineResult } from '../score-engine';
import { A, RANKONLY, runOn } from '../score-engine/fixtures';
import { SEAL_FLOOR_FRACTION, objectivesTile } from './objectives';

const alex = AssessmentSchema.parse(alexRaw);
const result = evaluate(alex.workbook, {
  ...alex,
  parties: [...alex.parties, ...(alex.partiesAdded ?? [])],
});
const model = objectivesTile(result, alex.workbook);

describe('objectivesTile', () => {
  it('lays the wedges out by authored weight, in workbook order', () => {
    expect(model.arcs.map((a) => [a.id, a.weight])).toEqual([
      ['SOV-1', 20],
      ['SOV-2', 10],
      ['SOV-3', 10],
      ['SOV-4', 15],
      ['SOV-5', 10],
      ['SOV-6', 15],
      ['SOV-7', 15],
      ['SOV-8', 5],
    ]);
    const bounds = [
      [0, 0.2],
      [0.2, 0.3],
      [0.3, 0.4],
      [0.4, 0.55],
      [0.55, 0.65],
      [0.65, 0.8],
      [0.8, 0.95],
      [0.95, 1],
    ];
    model.arcs.forEach((arc, i) => {
      expect(arc.startFraction).toBeCloseTo(bounds[i]![0]!, 10);
      expect(arc.endFraction).toBeCloseTo(bounds[i]![1]!, 10);
    });
  });

  it('reads each objective standing off the engine result', () => {
    expect(model.arcs.map((a) => a.standing.kind)).toEqual([
      'asserted',
      'asserted',
      'asserted',
      'asserted',
      'asserted',
      'asserted',
      'asserted',
      'informational',
    ]);
    const asserted = model.arcs
      .map((a) => a.standing)
      .filter((s) => s.kind === 'asserted');
    expect(asserted.map((s) => s.seal)).toEqual([1, 1, 2, 1, 1, 1, 2]);
    const scores = [
      53.57142857142857, 64.28571428571429, 47.91666666666667, 48.68421052631579, 50,
      40.625, 58.333333333333336,
    ];
    asserted.forEach((s, i) => expect(s.score).toBeCloseTo(scores[i]!, 6));
  });

  it('gives SEAL-0 a visible radius, distinct from absence', () => {
    expect(SEAL_FLOOR_FRACTION).toBe(0.15);
    const asserted = model.arcs
      .map((a) => a.standing)
      .filter((s) => s.kind === 'asserted');
    asserted
      .filter((s) => s.seal === 1)
      .forEach((s) => expect(s.radiusFraction).toBeCloseTo(0.3625, 10));
    asserted
      .filter((s) => s.seal === 2)
      .forEach((s) => expect(s.radiusFraction).toBeCloseTo(0.575, 10));
    const sov8 = model.arcs.find((a) => a.id === 'SOV-8')!.standing;
    expect('radiusFraction' in sov8).toBe(false);
  });

  it('lays a guide ring on every authored SEAL level', () => {
    expect(model.rungs.map((r) => r.seal)).toEqual([0, 1, 2, 3, 4]);
    expect(model.rungs[0]!.radiusFraction).toBeCloseTo(SEAL_FLOOR_FRACTION, 10);
    expect(model.rungs[4]!.radiusFraction).toBeCloseTo(1, 10);
  });

  it('labels each wedge with its own weight and standing', () => {
    const sov1 = model.arcs.find((a) => a.id === 'SOV-1')!;
    expect(sov1.midFraction).toBeCloseTo(0.1, 10);
    expect(sov1.sub).toBe('20% · SEAL-1');
    expect(sov1.summary).toBe('Strategic Sovereignty · SOV-1 · 20% of the score · SEAL-1 · 53.6');
    expect(model.arcs.find((a) => a.id === 'SOV-8')!.sub).toBe('5% · informational');
  });

  it('says in words where weakness coincides with leverage', () => {
    // SEAL-1 is the lowest asserted standing; SOV-1 is the heaviest objective
    // sitting at it.
    expect(model.headline).toBe('Strategic Sovereignty carries 20% of the score at SEAL-1.');
  });

  it('names an objective informational only when every question is', () => {
    expect(model.arcs.find((a) => a.id === 'SOV-7')!.standing.kind).toBe('asserted');
    expect(model.arcs.find((a) => a.id === 'SOV-8')!.standing.kind).toBe('informational');
  });

  it('reports an objective the engine could not seal as unanswered', () => {
    const workbook: Workbook = {
      ...alex.workbook,
      objectives: [
        { ...alex.workbook.objectives[0]!, id: 'A', weight: 50 },
        { ...alex.workbook.objectives[0]!, id: 'B', weight: 50 },
      ],
    };
    const unsealed: EngineResult = {
      ...result,
      objectives: [
        { id: 'A', seal: 1 as Seal, binding: [], unknowns: [], score: 40, dontKnowCount: 0 },
        { id: 'B', seal: null, binding: [], unknowns: [], score: null, dontKnowCount: 0 },
      ],
    };
    const tile = objectivesTile(unsealed, workbook);
    expect(tile.arcs.map((a) => a.standing.kind)).toEqual(['asserted', 'unanswered']);

    const nothing = objectivesTile(
      {
        ...unsealed,
        objectives: unsealed.objectives.map((o) => ({ ...o, seal: null, score: null })),
      },
      workbook,
    );
    expect(nothing.headline).toMatch(/^Nothing asserted yet/);
  });

  it('an objective that scores with nothing gating reads ranked, not gated', () => {
    const tile = objectivesTile(runOn(RANKONLY, [A('q1', 2)]), RANKONLY);
    const arc = tile.arcs[0];
    expect(arc.standing.kind).toBe('ranked');
    if (arc.standing.kind !== 'ranked') throw new Error('expected a ranked standing');
    expect(arc.standing.score).toBe(50);
    expect(arc.sub).toBe('100% · ranked, not gated');
  });
});

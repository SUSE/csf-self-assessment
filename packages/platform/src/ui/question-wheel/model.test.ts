import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Answer, DimensionQuestion, Party, Question, Seal, Target } from '../../schema';
import { defaultParties, questionOf } from '../../assessment';
import type { ExposureMarker } from '../wheel';
import {
  isBinding,
  markerTitle,
  questionWheelModel,
  unitTitle,
  wheelSummary,
  type WheelModel,
  type WheelUnit,
  type WheelUnitState,
} from './model';
import { csfWorkbookRaw } from '../../test-fixtures';

const WB = WorkbookSchema.parse(csfWorkbookRaw);
const PARTIES: Party[] = defaultParties(WB);

// SOV-4.kill-switch is the useful specimen: it fans over compute (critical,
// strata-splittable), platform (critical) and edge (NOT critical) — so one
// question carries both a gating and a scoring-only unit.
function question(id: string): Question {
  for (const objective of WB.objectives) {
    const found = objective.questions.find((q) => q.id === id);
    if (found) return found;
  }
  throw new Error(`no question ${id}`);
}
const KILL = question('SOV-4.kill-switch') as DimensionQuestion;

const rungIdFor = (questionId: string, seal: Seal): string => {
  const rung = questionOf(WB, questionId)?.ladder.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal} on ${questionId}`);
  return rung.id;
};

function answered(target: Target, seal: Seal, extra: Partial<Answer> = {}): Answer {
  return {
    questionId: KILL.id,
    target,
    state: 'answered',
    rungId: rungIdFor(KILL.id, seal),
    gesture: { groupId: 'g1', placement: 'individual' },
    ...extra,
  } as Answer;
}
const dim = (dimension: string): Target => ({ kind: 'dimension', dimension });
const stratum = (dimension: string, s: string): Target => ({
  kind: 'dimension-stratum',
  dimension,
  stratum: s,
});

describe('questionWheelModel', () => {
  it('fans out over the authored appliesTo, and only critical dimensions gate', () => {
    const model = questionWheelModel(WB, PARTIES, [], KILL);
    expect(model.units.map((u) => (u.target.kind === 'dimension' ? u.target.dimension : ''))).toEqual([
      'compute',
      'platform',
      'edge',
    ]);
    // Labels are the authored names, never re-spelled by the wheel.
    expect(model.units.map((u) => u.label)).toEqual(
      ['compute', 'platform', 'edge'].map((id) => WB.dimensions.find((d) => d.id === id)?.name),
    );
    expect(model.units.map((u) => u.gates)).toEqual([true, true, false]);
    expect(model.open).toBe(3);
    expect(model.gating).toBe(2);
  });

  it('leaves unanswered units in the denominator without floating a binding', () => {
    const model = questionWheelModel(WB, PARTIES, [], KILL);
    expect(model.bindingPotential).toBeNull();
    expect(model.earned).toBe(0);
    expect(model.attainable).toBe(300);
  });

  it('does not let a non-critical unit set the binding potential', () => {
    const model = questionWheelModel(WB, PARTIES, [answered(dim('edge'), 0)], KILL);
    expect(model.bindingPotential).toBeNull();
    expect(model.earned).toBe(0);
    expect(model.placed).toBe(1);
  });

  it('takes the minimum over gating answers only', () => {
    const model = questionWheelModel(
      WB,
      PARTIES,
      [answered(dim('compute'), 3), answered(dim('platform'), 1), answered(dim('edge'), 0)],
      KILL,
    );
    expect(model.bindingPotential).toBe(1);
    expect(model.earned).toBe(100);
    expect(model.attainable).toBe(300);
  });

  it("counts a don't-know as an unknown only where it would gate, and drops it from attainable", () => {
    const gating: Answer = {
      questionId: KILL.id,
      target: dim('compute'),
      state: 'dont-know',
      gesture: { groupId: 'g1', placement: 'individual' },
    };
    const notGating: Answer = { ...gating, target: dim('edge') };
    const model = questionWheelModel(WB, PARTIES, [gating, notGating], KILL);
    expect(model.unknowns).toBe(1);
    expect(model.dontKnowTotal).toBe(2);
    expect(model.attainable).toBe(100);
  });

  it('excludes a declared n/a entirely — never a zero', () => {
    const na: Answer = {
      questionId: KILL.id,
      target: dim('edge'),
      state: 'na',
      gesture: { groupId: 'g1', placement: 'individual' },
    };
    const model = questionWheelModel(WB, PARTIES, [na, answered(dim('compute'), 2)], KILL);
    expect(model.na).toBe(1);
    expect(model.attainable).toBe(200);
    expect(model.earned).toBe(50);
  });

  it('follows the split: strata replace the compute unit once a refinement exists', () => {
    const model = questionWheelModel(WB, PARTIES, [answered(stratum('compute', 'chips'), 0)], KILL);
    const labels = model.units.map((u) => (u.sub ? `${u.label}·${u.sub}` : u.label));
    expect(labels).toContain('Compute·chips');
    expect(labels).not.toContain('Compute');
    expect(model.bindingPotential).toBe(0);
    expect(model.units.length).toBe(6);
  });

  it('reads the gesture and the evidence note off the answer', () => {
    const swept = answered(dim('compute'), 2, {
      gesture: { groupId: 'g9', placement: 'group' },
      evidence: 'Runbook 4.2, tested March',
    });
    const model = questionWheelModel(WB, PARTIES, [swept], KILL);
    expect(model.swept).toBe(1);
    expect(model.evidenced).toBe(1);
    expect(model.units[0].swept).toBe(true);
    expect(model.units[0].evidence).toBe(true);
  });

  it('a ranking question scores its units and gates none', () => {
    const answers = [answered(dim('compute'), 0)];
    const asMaterial = questionWheelModel(WB, PARTIES, answers, KILL);
    const ranking = { ...KILL, defaultMateriality: 'ranking' as const };
    const model = questionWheelModel(WB, PARTIES, answers, ranking);

    expect(model.gatesFloor).toBe(false);
    expect(model.units.every((u) => !u.gates)).toBe(true);
    expect(model.bindingPotential).toBeNull();
    expect(model.attainable).toBe(asMaterial.attainable);
  });

  it('an informational question attains nothing', () => {
    const informational = { ...KILL, defaultMateriality: 'informational' as const };
    const model = questionWheelModel(WB, PARTIES, [answered(dim('compute'), 0)], informational);
    expect(model.attainable).toBe(0);
  });

  it('never gates on an informational question', () => {
    const informational = { ...KILL, defaultMateriality: 'informational' as const };
    const model = questionWheelModel(WB, PARTIES, [answered(dim('compute'), 0)], informational);
    expect(model.gatesFloor).toBe(false);
    expect(model.units.every((u) => !u.gates)).toBe(true);
    expect(model.bindingPotential).toBeNull();
  });
});

describe('questionWheelModel exposure ring', () => {
  const ACME = { id: 'acme', name: 'Acme Cloud EU', type: 'primary-provider', serves: ['compute', 'platform'] };
  const SILICON = { id: 'silicon', name: 'Silicon Corp', type: 'supplier', serves: ['compute'] };
  const US = { id: 'inst', name: 'Our institution', type: 'institution', serves: ['compute'] };
  const CAST: Party[] = [US, ACME, SILICON];
  const EDGES = [
    { party: 'acme', dimension: 'compute', worstSeal: 1 as Seal },
    { party: 'silicon', dimension: 'compute', worstSeal: 0 as Seal },
    { party: 'acme', dimension: 'platform', worstSeal: 1 as Seal },
    { party: 'inst', dimension: 'compute', worstSeal: 4 as Seal },
  ];

  it('hangs the serving third parties off each dimension unit', () => {
    const model = questionWheelModel(WB, CAST, [], KILL, EDGES);
    const compute = model.units[0];
    expect(compute.exposure.map((m) => m.label)).toEqual(['Acme Cloud EU', 'Silicon Corp']);
    expect(compute.exposure.map((m) => m.seal)).toEqual([1, 0]);
    expect(model.units[1].exposure.map((m) => m.key)).toEqual(['acme']);
    expect(model.units[2].exposure).toEqual([]);
  });

  it('never puts the assessed party on the ring', () => {
    const model = questionWheelModel(WB, CAST, [], KILL, EDGES);
    expect(model.units[0].exposure.some((m) => m.key === 'inst')).toBe(false);
  });

  it('lets strata inherit their parent dimension, because serves names dimensions', () => {
    const model = questionWheelModel(WB, CAST, [answered(stratum('compute', 'chips'), 0)], KILL, EDGES);
    const strata = model.units.filter((u) => u.target.kind === 'dimension-stratum');
    expect(strata.length).toBe(4);
    for (const unit of strata) expect(unit.exposure.map((m) => m.key)).toEqual(['acme', 'silicon']);
  });

  it('carries a null seal when the party has not been answered yet', () => {
    const model = questionWheelModel(WB, CAST, [], KILL, [
      { party: 'acme', dimension: 'compute', worstSeal: null },
    ]);
    expect(model.units[0].exposure[0].seal).toBeNull();
  });

  it('reports the ring as uninformative when every unit looks the same', () => {
    const everywhere = ['compute', 'platform', 'edge'].map((dimension) => ({
      party: 'acme',
      dimension,
      worstSeal: 1 as Seal,
    }));
    expect(questionWheelModel(WB, CAST, [], KILL, everywhere).exposureInformative).toBe(false);
    expect(questionWheelModel(WB, CAST, [], KILL, EDGES).exposureInformative).toBe(true);
    expect(questionWheelModel(WB, CAST, [], KILL, []).exposureInformative).toBe(false);
  });

  it('reserves the first marker slot for a dont-know', () => {
    const unknown: Answer = {
      questionId: KILL.id,
      target: dim('compute'),
      state: 'dont-know',
      gesture: { groupId: 'g1', placement: 'individual' },
    };
    const model = questionWheelModel(WB, CAST, [unknown], KILL, EDGES);
    expect(model.maxExposure).toBe(2);
    expect(model.maxMarkerStack).toBe(3);
  });

  it('adds no ring at all when no edges are supplied', () => {
    const model = questionWheelModel(WB, CAST, [], KILL);
    expect(model.maxExposure).toBe(0);
    expect(model.units.every((u) => u.exposure.length === 0)).toBe(true);
  });
});

// Builders for the string functions: they read a unit or a whole model, so each
// case states only the fields it varies.
const marker = (label: string, seal: Seal | null): ExposureMarker => ({
  key: `party:${label}`,
  label,
  seal,
  emphasis: false,
});

function unit(over: {
  label?: string;
  sub?: string;
  gates?: boolean;
  state?: WheelUnitState;
  seal?: Seal | null;
  evidence?: boolean;
  swept?: boolean;
  exposure?: ExposureMarker[];
}): WheelUnit {
  return {
    key: 'dimension:compute',
    target: dim('compute'),
    label: over.label ?? 'Compute',
    sub: over.sub ?? '',
    gates: over.gates ?? true,
    state: over.state ?? 'answered',
    seal: over.seal === undefined ? 2 : over.seal,
    evidence: over.evidence ?? false,
    swept: over.swept ?? false,
    exposure: over.exposure ?? [],
  };
}

function wheelModelOf(over: {
  units?: WheelUnit[];
  bindingPotential?: Seal | null;
  unknowns?: number;
  open?: number;
  gating?: number;
  evidenced?: number;
}): WheelModel {
  return {
    units: over.units ?? [],
    gatesFloor: true,
    bindingPotential: over.bindingPotential === undefined ? null : over.bindingPotential,
    unknowns: over.unknowns ?? 0,
    dontKnowTotal: 0,
    open: over.open ?? 0,
    na: 0,
    placed: 0,
    gating: over.gating ?? 0,
    evidenced: over.evidenced ?? 0,
    swept: 0,
    earned: 0,
    attainable: 0,
    maxMarkerStack: 0,
    maxExposure: 0,
    exposureInformative: true,
  };
}

describe('markerTitle', () => {
  it('names the party and its own compellability answer', () => {
    expect(markerTitle(marker('Hyperscaler A', null))).toBe(
      'Hyperscaler A serves this dimension — compellability not yet answered',
    );
    expect(markerTitle(marker('Hyperscaler A', 2))).toBe(
      'Hyperscaler A serves this dimension — compellable at SEAL-2',
    );
  });
});

describe('unitTitle', () => {
  it('reads an answered gating unit, evidence and sweep included', () => {
    expect(unitTitle(unit({ evidence: true }))).toBe(
      'Compute — SEAL-2, gates the floor, evidence recorded',
    );
    expect(unitTitle(unit({}))).toBe('Compute — SEAL-2, gates the floor, no evidence');
    expect(unitTitle(unit({ evidence: true, swept: true }))).toBe(
      'Compute — SEAL-2, gates the floor, evidence recorded, swept',
    );
    expect(unitTitle(unit({ evidence: true, gates: false }))).toBe(
      'Compute — SEAL-2, scores only, never floors, evidence recorded',
    );
    expect(unitTitle(unit({ sub: 'service', evidence: true }))).toBe(
      'Compute · service — SEAL-2, gates the floor, evidence recorded',
    );
  });

  it('reads the three unplaced states', () => {
    expect(unitTitle(unit({ state: 'dont-know', seal: null }))).toBe(
      "Compute — don't know, gates the floor",
    );
    expect(unitTitle(unit({ state: 'na', seal: null }))).toBe('Compute — n/a, excluded');
    expect(unitTitle(unit({ state: 'unanswered', seal: null }))).toBe(
      'Compute — no record yet, gates the floor',
    );
  });

  it('appends every serving party', () => {
    expect(unitTitle(unit({ exposure: [marker('A', 1), marker('B', null)] }))).toBe(
      'Compute — SEAL-2, gates the floor, no evidence; served by A, B',
    );
  });
});

describe('wheelSummary', () => {
  it('counts what is still open, singular and plural', () => {
    expect(wheelSummary(wheelModelOf({ open: 1 }), false)).toContain('1 unit with no record');
    expect(wheelSummary(wheelModelOf({ open: 2 }), false)).toContain('2 units with no record');
    expect(wheelSummary(wheelModelOf({ unknowns: 1 }), false)).toContain(
      '1 unknown on a gating unit',
    );
    expect(wheelSummary(wheelModelOf({ unknowns: 2 }), false)).toContain(
      '2 unknowns on a gating unit',
    );
    expect(wheelSummary(wheelModelOf({ gating: 3, evidenced: 2 }), false)).toContain(
      '1 gating answer without evidence',
    );
    expect(wheelSummary(wheelModelOf({ gating: 3, evidenced: 1 }), false)).toContain(
      '2 gating answers without evidence',
    );
  });

  it('explains the marker ring only when it is drawn', () => {
    const markers = 'Markers outside the rim are the third parties serving each dimension.';
    expect(wheelSummary(wheelModelOf({}), true)).toContain(markers);
    expect(wheelSummary(wheelModelOf({}), false)).not.toContain(markers);
  });
});

describe('isBinding', () => {
  it('marks only a gating unit sitting on the question binding rung', () => {
    const u = unit({ seal: 2 });
    expect(isBinding(wheelModelOf({ bindingPotential: 2 }), u, true)).toBe(true);
    expect(isBinding(wheelModelOf({ bindingPotential: 2 }), u, false)).toBe(false);
    expect(isBinding(wheelModelOf({ bindingPotential: 3 }), u, true)).toBe(false);
    expect(isBinding(wheelModelOf({ bindingPotential: null }), u, true)).toBe(false);
    expect(isBinding(wheelModelOf({ bindingPotential: 2 }), unit({ seal: 2, gates: false }), true)).toBe(
      false,
    );
  });
});

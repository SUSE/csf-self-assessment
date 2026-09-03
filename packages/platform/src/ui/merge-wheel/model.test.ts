import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Answer, Party, Seal, Target } from '../../schema';
import type { LandingClash } from '../../merge';
import { defaultParties, questionOf } from '../../assessment';
import type { ChipKind, ExposureMarker } from '../wheel';
import {
  chipTitle,
  coverageRadius,
  markerTitle,
  mergeWheelModel,
  type ChipConflict,
  type MergeChip,
} from './model';

const SAMPLE = fileURLToPath(new URL('../../../../../samples/csf-workbook.json', import.meta.url));
const WB = WorkbookSchema.parse(JSON.parse(readFileSync(SAMPLE, 'utf8')));
const PARTIES: Party[] = defaultParties(WB);

const rungIdFor = (questionId: string, seal: Seal): string => {
  const rung = questionOf(WB, questionId)?.ladder.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal} on ${questionId}`);
  return rung.id;
};

function answered(questionId: string, target: Target, seal: Seal): Answer {
  return {
    questionId,
    target,
    state: 'answered',
    rungId: rungIdFor(questionId, seal),
    gesture: { groupId: 'g1', placement: 'individual' },
  } as Answer;
}
const dim = (dimension: string): Target => ({ kind: 'dimension', dimension });

function chip(model: ReturnType<typeof mergeWheelModel>, kind: string, key: string) {
  const found = model.chips.find((c) => c.kind === kind && c.key === key);
  if (!found) throw new Error(`no chip ${kind}:${key}`);
  return found;
}

describe('mergeWheelModel', () => {
  it('gives every authored dimension a chip — the workbook is the estate', () => {
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers: [] });
    const dimensionKeys = model.chips.filter((c) => c.kind === 'dimension').map((c) => c.key);
    expect(dimensionKeys).toEqual(WB.dimensions.map((d) => d.id));
  });

  it('separates the assessment chip from the two axes', () => {
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers: [] });
    const assessment = chip(model, 'assessment', 'assessment');
    expect(assessment.total).toBeGreaterThan(0);
    expect(model.chips.filter((c) => c.kind === 'party').length).toBe(PARTIES.length);
  });

  it('marks non-critical dimensions as scoring-only', () => {
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers: [] });
    expect(chip(model, 'dimension', 'compute').gates).toBe(true);
    expect(chip(model, 'dimension', 'edge').gates).toBe(false);
    expect(chip(model, 'party', PARTIES[0].id).gates).toBe(true);
  });

  it('never mints a floor of its own — it is an input from evaluate()', () => {
    const answers = [answered('SOV-4.kill-switch', dim('compute'), 0)];
    const working = mergeWheelModel({ workbook: WB, parties: PARTIES, answers });
    expect(working.floor).toBeNull();
    const finalized = mergeWheelModel({ workbook: WB, parties: PARTIES, answers, floor: 0, unknowns: 2 });
    expect(finalized.floor).toBe(0);
    expect(finalized.unknowns).toBe(2);
  });

  it('counts a recorded unit as covered and leaves the rest unclaimed without a scope log', () => {
    const answers = [answered('SOV-4.kill-switch', dim('compute'), 2)];
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers });
    const compute = chip(model, 'dimension', 'compute');
    expect(compute.covered).toBe(1);
    expect(compute.claimedIncomplete).toBe(0);
    expect(compute.unclaimed).toBe(compute.total - 1);
    expect(compute.seals).toEqual([2]);
  });

  it('splits the remainder once a scope log says what was claimed', () => {
    const answers = [answered('SOV-4.kill-switch', dim('compute'), 2)];
    const model = mergeWheelModel({
      workbook: WB,
      parties: PARTIES,
      answers,
      scope: [{ kind: 'dimension', key: 'compute', claimedIncomplete: 3 }],
    });
    const compute = chip(model, 'dimension', 'compute');
    expect(compute.claimedIncomplete).toBe(3);
    expect(compute.covered + compute.claimedIncomplete + compute.unclaimed).toBe(compute.total);
  });

  it('never lets a scope log claim more than is left', () => {
    const model = mergeWheelModel({
      workbook: WB,
      parties: PARTIES,
      answers: [],
      scope: [{ kind: 'dimension', key: 'edge', claimedIncomplete: 9999 }],
    });
    const edge = chip(model, 'dimension', 'edge');
    expect(edge.claimedIncomplete).toBe(edge.total);
    expect(edge.unclaimed).toBe(0);
  });

  it('hangs an open conflict on the chip its target names, seals ascending', () => {
    const clash: LandingClash = {
      kind: 'unit-clash',
      clash: 'divergence',
      questionId: 'SOV-4.kill-switch',
      target: dim('compute'),
      base: { from: 'ARCH/Ana', answer: answered('SOV-4.kill-switch', dim('compute'), 2), claim: null, authority: 'out-of-claim' },
      incoming: { from: 'OPS/Bram', answer: answered('SOV-4.kill-switch', dim('compute'), 0), claim: null, authority: 'out-of-claim' },
    };
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers: [], clashes: [clash] });
    const compute = chip(model, 'dimension', 'compute');
    expect(compute.conflicts.length).toBe(1);
    expect(compute.conflicts[0].seals).toEqual([0, 2]);
    expect(compute.conflicts[0].resolved).toBeNull();
    expect(model.openConflicts).toBe(1);
  });

  it('a grain clash marks its dimension chip once', () => {
    const stratumTarget = (stratum: string): Target => ({
      kind: 'dimension-stratum',
      dimension: 'storage',
      stratum,
    });
    const clash: LandingClash = {
      kind: 'grain-clash',
      clash: 'grain',
      questionId: 'SOV-4.kill-switch',
      dimension: 'storage',
      target: { kind: 'dimension', dimension: 'storage' },
      rollUp: {
        from: 'ARCH/Ana',
        answer: answered('SOV-4.kill-switch', { kind: 'dimension', dimension: 'storage' }, 2),
        claim: null,
        authority: 'out-of-claim',
      },
      strata: ['service', 'software'].map((stratum, index) => ({
        stratum,
        target: { kind: 'dimension-stratum', dimension: 'storage', stratum },
        candidate: {
          from: 'OPS/Bram',
          answer: answered('SOV-4.kill-switch', stratumTarget(stratum), (1 - index) as Seal),
          claim: null,
          authority: 'out-of-claim',
        },
      })),
      rollUpSide: 'base',
    };
    const model = mergeWheelModel({ workbook: WB, parties: PARTIES, answers: [], clashes: [clash] });
    const storage = chip(model, 'dimension', 'storage');
    expect(storage.conflicts.length).toBe(1);
    expect(storage.conflicts[0].seals).toEqual([0, 1, 2]);
    expect(storage.conflicts[0].resolved).toBeNull();
    expect(model.openConflicts).toBe(1);
  });

  it('keeps a resolved conflict visible as a mergeEvent', () => {
    const model = mergeWheelModel({
      workbook: WB,
      parties: PARTIES,
      answers: [],
      resolutions: [{ questionId: 'SOV-4.kill-switch', target: dim('compute'), seal: 2 }],
    });
    expect(chip(model, 'dimension', 'compute').conflicts[0].resolved).toBe(2);
    expect(model.resolvedConflicts).toBe(1);
  });
});

describe('mergeWheelModel exposure ring', () => {
  const CAST: Party[] = [
    { id: 'inst', name: 'Our institution', type: 'institution', serves: ['compute'] },
    { id: 'acme', name: 'Acme Cloud EU', type: 'primary-provider', serves: ['compute', 'edge'] },
    { id: 'silicon', name: 'Silicon Corp', type: 'supplier', serves: ['compute'] },
  ];
  const EDGES = [
    { party: 'acme', dimension: 'compute', worstSeal: 1 as Seal },
    { party: 'acme', dimension: 'edge', worstSeal: 1 as Seal },
    { party: 'silicon', dimension: 'compute', worstSeal: 0 as Seal },
    { party: 'inst', dimension: 'compute', worstSeal: 4 as Seal },
  ];

  it('reads a dimension chip as the parties standing under it', () => {
    const model = mergeWheelModel({ workbook: WB, parties: CAST, answers: [], exposure: EDGES });
    expect(chip(model, 'dimension', 'compute').exposure.map((m) => m.label)).toEqual([
      'Acme Cloud EU',
      'Silicon Corp',
    ]);
    expect(chip(model, 'dimension', 'compute').exposure.map((m) => m.seal)).toEqual([1, 0]);
    expect(chip(model, 'dimension', 'storage').exposure).toEqual([]);
  });

  it('reads a party chip the other way — its reach, criticals emphasised', () => {
    const model = mergeWheelModel({ workbook: WB, parties: CAST, answers: [], exposure: EDGES });
    const acme = chip(model, 'party', 'acme');
    expect(acme.exposure.map((m) => m.key)).toEqual(['compute', 'edge']);
    // compute is critical in this workbook, edge is not.
    expect(acme.exposure.map((m) => m.emphasis)).toEqual([true, false]);
    expect(acme.exposure.every((m) => m.seal === null)).toBe(true);
  });

  it('keeps the assessed party off both directions of the ring', () => {
    const model = mergeWheelModel({ workbook: WB, parties: CAST, answers: [], exposure: EDGES });
    expect(chip(model, 'dimension', 'compute').exposure.some((m) => m.key === 'inst')).toBe(false);
    expect(chip(model, 'party', 'inst').exposure).toEqual([]);
  });

  it('leaves the assessment chip out of it', () => {
    const model = mergeWheelModel({ workbook: WB, parties: CAST, answers: [], exposure: EDGES });
    expect(chip(model, 'assessment', 'assessment').exposure).toEqual([]);
  });

  it('adds no ring when no edges are supplied', () => {
    const model = mergeWheelModel({ workbook: WB, parties: CAST, answers: [] });
    expect(model.maxExposure).toBe(0);
    expect(model.exposureInformative).toBe(false);
    expect(model.chips.every((c) => c.exposure.length === 0)).toBe(true);
  });
});

// Builders for the string functions: each case states only what it varies.
const marker = (label: string, seal: Seal | null, emphasis = false): ExposureMarker => ({
  key: `edge:${label}`,
  label,
  seal,
  emphasis,
});
const openConflict = (seals: Seal[]): ChipConflict => ({
  questionId: 'SOV-4.kill-switch',
  target: { kind: 'dimension', dimension: 'compute' },
  seals,
  resolved: null,
});

function mergeChip(over: {
  kind?: ChipKind;
  name?: string;
  gates?: boolean;
  total?: number;
  covered?: number;
  claimedIncomplete?: number;
  unclaimed?: number;
  conflicts?: ChipConflict[];
  exposure?: ExposureMarker[];
}): MergeChip {
  return {
    kind: over.kind ?? 'dimension',
    key: 'compute',
    name: over.name ?? 'Compute',
    sub: '',
    gates: over.gates ?? true,
    total: over.total ?? 5,
    covered: over.covered ?? 2,
    claimedIncomplete: over.claimedIncomplete ?? 1,
    unclaimed: over.unclaimed ?? 2,
    seals: [],
    conflicts: over.conflicts ?? [],
    exposure: over.exposure ?? [],
  };
}

describe('markerTitle', () => {
  it('reads a party chip edge as reach, emphasis included', () => {
    const party = mergeChip({ kind: 'party', name: 'Hyperscaler A' });
    expect(markerTitle(party, marker('Compute', null))).toBe('Hyperscaler A reaches Compute');
    expect(markerTitle(party, marker('Compute', null, true))).toBe(
      'Hyperscaler A reaches Compute — a critical dimension',
    );
  });

  it('reads a dimension chip edge as service, with the party own compellability', () => {
    const dimension = mergeChip({});
    expect(markerTitle(dimension, marker('Hyperscaler A', null))).toBe(
      'Hyperscaler A serves Compute — compellability not yet answered',
    );
    expect(markerTitle(dimension, marker('Hyperscaler A', 3))).toBe(
      'Hyperscaler A serves Compute — compellable at SEAL-3',
    );
  });
});

describe('chipTitle', () => {
  it('reads the coverage split, the open conflicts and the gate', () => {
    expect(chipTitle(mergeChip({ conflicts: [openConflict([1, 3])] }))).toBe(
      'Compute — 2 of 5 covered, 1 claimed-incomplete, 2 unclaimed, 1 open conflict, gates the floor',
    );
    expect(
      chipTitle(mergeChip({ conflicts: [openConflict([1, 3]), openConflict([0, 2])] })),
    ).toBe(
      'Compute — 2 of 5 covered, 1 claimed-incomplete, 2 unclaimed, 2 open conflicts, gates the floor',
    );
    expect(chipTitle(mergeChip({ gates: false }))).toBe(
      'Compute — 2 of 5 covered, 1 claimed-incomplete, 2 unclaimed, 0 open conflicts, scores only, never floors',
    );
  });

  it('appends the reach of a party chip and the servers of a dimension chip', () => {
    expect(
      chipTitle(
        mergeChip({ kind: 'party', name: 'Hyperscaler A', exposure: [marker('Compute', null)] }),
      ),
    ).toContain('; reaches 1 dimension');
    expect(
      chipTitle(
        mergeChip({
          kind: 'party',
          name: 'Hyperscaler A',
          exposure: [marker('Compute', null), marker('Platform', null)],
        }),
      ),
    ).toContain('; reaches 2 dimensions');
    expect(chipTitle(mergeChip({ exposure: [marker('A', null), marker('B', 2)] }))).toContain(
      '; served by A, B',
    );
  });
});

describe('coverageRadius', () => {
  it('runs the hub to the rim, and stays at the hub with nothing to cover', () => {
    expect(coverageRadius(28, 140, 0, 0)).toBe(28);
    expect(coverageRadius(28, 140, 4, 2)).toBe(84);
    expect(coverageRadius(28, 140, 4, 4)).toBe(140);
  });
});

import { describe, expect, it } from 'vitest';
import type { Seal } from '../schema';
import { estateWheelTile, spokeFraction } from './estate-wheel';
import type { EstateSpoke, EstateWheelTile } from './estate-wheel';
import { SUBJECT_A, SUBJECT_C, SUBJECT_EMPTY } from './subjects-fixture';
import type { Subject } from './subjects-fixture';

function wheelOf(subject: Subject): Extract<EstateWheelTile, { kind: 'wheel' }> {
  const view = estateWheelTile(subject.result, subject.workbook, subject.parties);
  if (view.kind !== 'wheel') throw new Error(`expected a wheel, got ${view.kind}`);
  return view;
}

function spoke(view: Extract<EstateWheelTile, { kind: 'wheel' }>, key: string): EstateSpoke {
  const found = view.spokes.find((s) => s.key === key);
  if (found === undefined) throw new Error(`no spoke keyed ${key}`);
  return found;
}

describe('spokeFraction', () => {
  it('gives a SEAL-0 spoke a short but visible reach', () => {
    expect(spokeFraction(0)).toBe(0.2);
  });

  it('gives a SEAL-4 spoke the whole rim', () => {
    expect(spokeFraction(4)).toBe(1);
  });

  it('is strictly increasing over the ladder', () => {
    const ladder: Seal[] = [0, 1, 2, 3, 4];
    const fractions = ladder.map((seal) => spokeFraction(seal));
    for (let i = 1; i < fractions.length; i += 1) {
      expect(fractions[i]).toBeGreaterThan(fractions[i - 1] ?? 0);
    }
  });
});

describe('estateWheelTile — SUBJECT_C', () => {
  const view = wheelOf(SUBJECT_C);

  it('carries the estate chip, every declared dimension and every third party', () => {
    expect(view.spokes).toHaveLength(16);
    const keys = view.spokes.map((s) => s.key);
    expect(keys.slice(0, 6)).toEqual([
      'estate:assessment',
      'dimension:compute',
      'dimension:storage',
      'dimension:network',
      'dimension:iam',
      'dimension:platform',
    ]);
    expect(keys.slice(-5)).toEqual([
      'party:acme-cloud',
      'party:modelhouse',
      'party:siliconware',
      'party:acme-eu',
      'party:northstar-edge',
    ]);
    expect(keys).not.toContain('party:inst');
  });

  it('reads a split critical dimension at its minimum, with a tick per asserted stratum', () => {
    const compute = spoke(view, 'dimension:compute');
    expect(compute.standing).toEqual({
      kind: 'asserted',
      seal: 0,
      fraction: 0.2,
      provenance: 'mixed',
    });
    expect(compute.answers).toBe(15);
    expect(compute.label).toBe('Compute');
    expect(compute.sub).toBe('critical');
    expect(compute.ticks).toEqual([
      { stratum: 'service', seal: 2 },
      { stratum: 'software', seal: 2 },
      { stratum: 'hardware', seal: 0 },
      { stratum: 'chips', seal: 1 },
    ]);
  });

  it('reads storage at its weakest stratum', () => {
    const storage = spoke(view, 'dimension:storage');
    expect(storage.standing).toEqual({
      kind: 'asserted',
      seal: 0,
      fraction: 0.2,
      provenance: 'mixed',
    });
    expect(storage.answers).toBe(8);
    expect(storage.ticks).toEqual([
      { stratum: 'service', seal: 2 },
      { stratum: 'software', seal: 2 },
      { stratum: 'hardware', seal: 1 },
      { stratum: 'chips', seal: 0 },
    ]);
  });

  it('names a non-gating dimension as such and leaves an unsplit one tickless', () => {
    const facilities = spoke(view, 'dimension:facilities');
    expect(facilities.standing).toMatchObject({ kind: 'asserted', seal: 4 });
    expect(facilities.answers).toBe(1);
    expect(facilities.sub).toBe('no gate');
    expect(facilities.ticks).toEqual([]);
  });

  it('grows a tick only where a stratum carries an asserted fact', () => {
    const network = spoke(view, 'dimension:network');
    expect(network.standing).toMatchObject({ kind: 'asserted', seal: 1 });
    expect(network.answers).toBe(3);
    expect(network.ticks).toEqual([]);
  });

  it('reads each third party at its own minimum, with the gesture behind it', () => {
    expect(spoke(view, 'party:northstar-edge').standing).toEqual({
      kind: 'asserted',
      seal: 1,
      fraction: spokeFraction(1),
      provenance: 'group',
    });
    expect(spoke(view, 'party:northstar-edge').answers).toBe(3);
    expect(spoke(view, 'party:acme-eu').standing).toEqual({
      kind: 'asserted',
      seal: 0,
      fraction: 0.2,
      provenance: 'individual',
    });
    expect(spoke(view, 'party:acme-eu').answers).toBe(5);
    expect(spoke(view, 'party:siliconware').standing).toMatchObject({ seal: 3 });
  });

  it('puts the whole-estate chip on the divider', () => {
    const estate = spoke(view, 'estate:assessment');
    expect(estate.standing).toMatchObject({ kind: 'asserted', seal: 1 });
    expect(estate.answers).toBe(6);
    expect(estate.sub).toBe('asked once');
    expect(estate.deg).toBe(0);
  });

  it('spreads the dimensions over the right arc and the parties over the left', () => {
    expect(spoke(view, 'dimension:compute').deg).toBeCloseTo(180 / 11);
    expect(spoke(view, 'dimension:facilities').deg).toBeCloseTo((180 * 10) / 11);
    expect(spoke(view, 'party:acme-cloud').deg).toBe(210);
    expect(spoke(view, 'party:northstar-edge').deg).toBe(330);
  });

  it('reads the weakest rung of the wheel in one sentence', () => {
    expect(view.headline).toBe('4 of 16 spokes sit at SEAL-0 — the shortest on the wheel.');
  });

  it('ranks every asserted material answer weakest first', () => {
    expect(view.links).toHaveLength(80);
    expect(view.links.slice(0, 4).map((link) => link.scope)).toEqual([
      'Acme Cloud Europe SAS · Legal',
      'Compute · hardware · Platform ops',
      'Storage · chips · Platform ops',
      'IAM · Security',
    ]);
    expect(view.links[0]).toEqual({
      key: 'SOV-1.decisive-authority|party:acme-eu',
      spoke: 'party:acme-eu',
      questionId: 'SOV-1.decisive-authority',
      scope: 'Acme Cloud Europe SAS · Legal',
      seal: 0,
    });
    expect(view.links[2]?.spoke).toBe('dimension:storage');
    for (let i = 1; i < view.links.length; i += 1) {
      expect(view.links[i]?.seal).toBeGreaterThanOrEqual(view.links[i - 1]?.seal ?? 0);
    }
  });
});

describe('estateWheelTile — SUBJECT_A', () => {
  const view = wheelOf(SUBJECT_A);

  it('reads the smaller roster and its weakest rung', () => {
    expect(view.spokes).toHaveLength(14);
    expect(view.headline).toBe('8 of 14 spokes sit at SEAL-1 — the shortest on the wheel.');
  });

  it('grows ticks only on the one dimension anybody split', () => {
    expect(spoke(view, 'dimension:compute').ticks).toEqual([
      { stratum: 'service', seal: 3 },
      { stratum: 'software', seal: 2 },
      { stratum: 'hardware', seal: 1 },
      { stratum: 'chips', seal: 1 },
    ]);
    expect(view.spokes.filter((s) => s.ticks.length > 0).map((s) => s.key)).toEqual([
      'dimension:compute',
    ]);
    const storage = spoke(view, 'dimension:storage');
    expect(storage.standing).toMatchObject({ seal: 2 });
    expect(storage.ticks).toEqual([]);
  });

  it('ranks this subject’s answers weakest first', () => {
    expect(view.links).toHaveLength(70);
    expect(view.links[0]?.scope).toBe('Acme Cloud EU · Legal');
  });
});

describe('estateWheelTile — SUBJECT_EMPTY', () => {
  it('says nothing is asserted rather than drawing a wheel of zeros', () => {
    const view = estateWheelTile(
      SUBJECT_EMPTY.result,
      SUBJECT_EMPTY.workbook,
      SUBJECT_EMPTY.parties,
    );
    if (view.kind !== 'empty') throw new Error('expected the empty reading');
    expect(view.reason).toContain('Nothing asserted yet');
  });
});

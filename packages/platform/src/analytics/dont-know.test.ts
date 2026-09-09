import { describe, expect, it } from 'vitest';
import type { HeatFact } from '../score-engine';
import { dontKnowTile } from './dont-know';
import { SUBJECT_A, SUBJECT_C } from './subjects-fixture';

describe('the don’t-know tile model', () => {
  it('names the floor’s hole and the grand total as two numbers', () => {
    const view = dontKnowTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    expect(view.kind).toBe('admitted');
    if (view.kind !== 'admitted') throw new Error('expected admitted');
    expect(view.holes).toBe(1);
    expect(view.total).toBe(1);
    expect(view.headline).toBe("1 of 1 don't-know answer gates the floor.");
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]!.questionId).toBe('SOV-2.enforceability');
    expect(view.rows[0]!.questionText).toBe(
      'Could the institution practically enforce an EU court judgment against this party?',
    );
    expect(view.rows[0]!.label).toBe('Acme Cloud Europe SAS');
    expect(view.rows[0]!.roleName).toBe('Legal');
    expect(view.rows[0]!.gatesFloor).toBe(true);
    expect(view.rows[0]!.key).toBe('SOV-2.enforceability|party:acme-eu');
  });

  it('reads the same two numbers on a single participant’s partial', () => {
    const view = dontKnowTile(SUBJECT_A.result, SUBJECT_A.workbook, SUBJECT_A.parties);
    if (view.kind !== 'admitted') throw new Error('expected admitted');
    expect(view.holes).toBe(1);
    expect(view.total).toBe(1);
    expect(view.rows[0]!.label).toBe('Network');
    expect(view.rows[0]!.roleName).toBe('Procurement');
    expect(view.rows[0]!.questionId).toBe('SOV-5.hardware-provenance');
    expect(view.rows[0]!.gatesFloor).toBe(true);
  });

  it('counts a don’t-know that gates nothing without calling it a hole', () => {
    const extra: HeatFact = {
      objective: 'SOV-4',
      questionId: 'SOV-4.patch-autonomy',
      role: 'OPS',
      target: { kind: 'dimension', dimension: 'aiml' },
      dimension: 'aiml',
      stratum: null,
      party: null,
      state: 'dont-know',
      seal: null,
      materiality: 'material',
      swept: false,
      evidence: false,
    };
    const view = dontKnowTile(
      { ...SUBJECT_A.result, facts: [...SUBJECT_A.result.facts, extra] },
      SUBJECT_A.workbook,
      SUBJECT_A.parties,
    );
    if (view.kind !== 'admitted') throw new Error('expected admitted');
    expect(view.holes).toBe(1);
    expect(view.total).toBe(2);
    expect(view.headline).toBe("1 of 2 don't-know answers gates the floor.");
    expect(view.rows).toHaveLength(2);
    expect(view.rows.map((r) => r.gatesFloor)).toEqual([true, false]);
    expect(view.rows[1]!.label).toBe('AI/ML platform');
    expect(view.rows[1]!.roleName).toBe('Platform ops');
  });

  it('says so when a file admits nothing', () => {
    const view = dontKnowTile(
      {
        ...SUBJECT_A.result,
        facts: SUBJECT_A.result.facts.filter((f) => f.state !== 'dont-know'),
        floorHoles: [],
      },
      SUBJECT_A.workbook,
      SUBJECT_A.parties,
    );
    expect(view.kind).toBe('none');
    if (view.kind !== 'none') throw new Error('expected none');
    expect(view.reason.length).toBeGreaterThan(0);
    // The base still reads with nothing admitted — the band draws bare over it.
    expect(view.placed).toBe(SUBJECT_A.result.units.total - SUBJECT_A.result.units.unanswered);
  });

  it('bases the band on every unit carrying an answer, not the sealed ones alone', () => {
    const view = dontKnowTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'admitted') throw new Error('expected admitted');
    const units = SUBJECT_C.result.units;
    expect(view.placed).toBe(units.total - units.unanswered);
    expect(view.placed).toBeGreaterThan(units.answered);
  });

  it('takes the total from the ribbon’s don’t-know, never the answer count', () => {
    for (const subject of [SUBJECT_A, SUBJECT_C]) {
      const view = dontKnowTile(subject.result, subject.workbook, subject.parties);
      if (view.kind !== 'admitted') throw new Error('expected admitted');
      expect(view.total).toBe(subject.result.units.dontKnow);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { evidenceTile } from './evidence';
import { SUBJECT_A, SUBJECT_C } from './subjects-fixture';

describe('the evidence tile model', () => {
  it('counts evidence over every gating answer, SEAL-4 included', () => {
    const view = evidenceTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    expect(view.kind).toBe('covered');
    if (view.kind !== 'covered') throw new Error('expected covered');
    expect(view.evidenced).toBe(9);
    expect(view.total).toBe(71);
    expect(view.headline).toBe('9 of 71 gating answers carry evidence.');
    expect(view.barFraction).toBeCloseTo(9 / 71, 10);
    // Carried for paint only — the bar wears the gate the coverage was read against.
    expect(view.floor).toBe(SUBJECT_C.result.overall.floor);
    expect(view.undefended).toHaveLength(62);
  });

  it('leads with the strongest undefended claims', () => {
    const view = evidenceTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'covered') throw new Error('expected covered');
    expect(view.undefended.slice(0, 4).map((r) => r.questionId)).toEqual([
      'SOV-2.compellability',
      'SOV-2.enforceability',
      'SOV-7.privileged-access',
      'SOV-1.decisive-authority',
    ]);
    expect(view.undefended[0]!.meta).toBe('SiliconWare Corp. · SEAL-4 · Legal');
    expect(view.undefended[0]!.key).toBe('SOV-2.compellability|null|null|siliconware');
  });

  it('counts the debt per objective in questions, heaviest first', () => {
    const view = evidenceTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'covered') throw new Error('expected covered');
    const owed = new Set(view.undefended.map((r) => r.questionId));
    const counts = view.undefendedByObjective.map((o) => o.questions);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(owed.size);
    expect(view.undefendedLabel).toBe(`${owed.size} questions`);
    // Heaviest first, and an objective that owes nothing is absent rather than zero.
    expect(counts.every((n, i) => (i === 0 || counts[i - 1]! >= n) && n > 0)).toBe(true);
    const named = view.undefendedByObjective.find((o) => o.objectiveId === 'SOV-2');
    expect(named?.objectiveName.length).toBeGreaterThan(0);
  });

  it('orders by seal only, so equal claims keep the engine’s order', () => {
    const view = evidenceTile(SUBJECT_C.result, SUBJECT_C.workbook, SUBJECT_C.parties);
    if (view.kind !== 'covered') throw new Error('expected covered');
    const seals = view.undefended.map((r) => r.seal);
    expect(seals.every((seal, i) => i === 0 || seals[i - 1]! >= seal)).toBe(true);
    expect(seals.slice(0, 3)).toEqual([4, 4, 4]);
    const last = view.undefended[view.undefended.length - 1]!;
    expect(last.questionId).toBe('SOV-7.iam-authority');
    expect(last.meta).toBe('IAM · SEAL-0 · Security');
  });

  it('reads a single participant’s partial', () => {
    const view = evidenceTile(SUBJECT_A.result, SUBJECT_A.workbook, SUBJECT_A.parties);
    if (view.kind !== 'covered') throw new Error('expected covered');
    expect(view.evidenced).toBe(8);
    expect(view.total).toBe(60);
    expect(view.undefended).toHaveLength(52);
    expect(view.headline).toBe('8 of 60 gating answers carry evidence.');
  });

  it('says so when a file has no gating answer yet', () => {
    const view = evidenceTile(
      {
        ...SUBJECT_A.result,
        gating: [],
        credibility: {
          ...SUBJECT_A.result.credibility,
          evidenceCoverage: { evidenced: 0, total: 0 },
        },
      },
      SUBJECT_A.workbook,
      SUBJECT_A.parties,
    );
    expect(view.kind).toBe('empty');
    if (view.kind !== 'empty') throw new Error('expected empty');
    expect(view.reason.length).toBeGreaterThan(0);
  });
});

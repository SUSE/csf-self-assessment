import { describe, expect, it } from 'vitest';
import { SUBJECT_A, SUBJECT_C } from './subjects-fixture';
import { staircaseRung, staircaseTile } from './staircase';

// The evaluated estates come from `subjects-fixture` — the one place the two
// landings are built. Rebuilding them here drifts from every other oracle.
const { result: A, workbook: alexWorkbook, parties: rosterA } = SUBJECT_A;
const { result: C, workbook: janeWorkbook, parties: janeParties } = SUBJECT_C;

describe('the staircase tile model', () => {
  it('heads with the answers pinning the floor', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    expect(view.kind).toBe('climb');
    if (view.kind !== 'climb') throw new Error('expected a climb');
    expect(view.headline).toBe('5 answers pin you at SEAL-0');
    expect(view.floor).toBe(0);
    expect(view.floorName).toBe('No Sovereignty');
    expect(view.climb).toBe('5 → 22 → 30 → 10');
    expect(view.summitName).toBe('Full Digital Sovereignty');
  });

  it('keeps every binding answer on its rung — the rail lists them, so nothing is capped', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    if (view.kind !== 'climb') throw new Error('expected a climb');
    expect(view.steps[0]!.rows).toHaveLength(5);

    const partial = staircaseTile(A, alexWorkbook, rosterA);
    if (partial.kind !== 'climb') throw new Error('expected a climb');
    expect(partial.headline).toBe('13 answers pin you at SEAL-1');
    expect(partial.climb).toBe('13 → 30 → 13');
    expect(partial.steps[0]!.rows).toHaveLength(13);
  });

  it('labels every target form the same way every other surface does', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    if (view.kind !== 'climb') throw new Error('expected a climb');
    expect(view.steps[0]!.rows.map((r) => `${r.label} · SEAL-${r.seal} · ${r.roleName}`)).toEqual([
      'Acme Cloud Europe SAS · SEAL-0 · Legal',
      'Acme Cloud Europe SAS · SEAL-0 · Legal',
      'Compute · hardware · SEAL-0 · Platform ops',
      'Storage · chips · SEAL-0 · Platform ops',
      'IAM · SEAL-0 · Security',
    ]);

    const partial = staircaseTile(A, alexWorkbook, rosterA);
    if (partial.kind !== 'climb') throw new Error('expected a climb');
    const second = partial.steps[0]!.rows[1]!;
    expect(`${second.label} · SEAL-${second.seal} · ${second.roleName}`).toBe(
      'whole estate · SEAL-1 · Procurement',
    );
  });

  it('carries the question text and its evidence presence', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    if (view.kind !== 'climb') throw new Error('expected a climb');
    const rows = view.steps[0]!.rows;
    expect(rows[1]!.questionId).toBe('SOV-2.compellability');
    expect(rows[1]!.evidence).toBe(true);
    expect(rows[3]!.questionId).toBe('SOV-4.withdrawal-survival');
    expect(rows[3]!.evidence).toBe(false);
    expect(rows[3]!.questionText.startsWith('Who could keep this dimension running')).toBe(true);
  });

  it('names what each rung unlocks', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    if (view.kind !== 'climb') throw new Error('expected a climb');
    expect(view.steps).toHaveLength(4);
    expect(view.steps.map((s) => s.floor)).toEqual([0, 1, 2, 3]);
    expect(view.steps.map((s) => s.count)).toEqual([5, 22, 30, 10]);
    expect(view.steps[0]!.unlocks).toBe('Fix these 5 → the floor rises to SEAL-1.');
    expect(view.steps[3]!.unlocks).toBe('Fix these 10 → the floor rises to SEAL-4.');
    expect(view.steps[0]!.title).toBe('SEAL-0 · No Sovereignty');
  });

  it('resolves a pressed tread to its rung, and an absent one to nothing', () => {
    const view = staircaseTile(C, janeWorkbook, janeParties);
    expect(staircaseRung(view, 2)?.count).toBe(30);
    // The rung the estate has already climbed past binds nothing, so there is no
    // tread to press and nothing for the rail to show.
    expect(staircaseRung(view, 4)).toBeNull();
    expect(staircaseRung(staircaseTile({ ...C, staircase: [] }, janeWorkbook, janeParties), 0)).toBeNull();
  });

  it('phrases a last rung and a single answer', () => {
    const view = staircaseTile(
      {
        ...C,
        overall: { ...C.overall, floor: 3 },
        staircase: [{ floor: 3, unlocksTo: null, binding: [C.staircase[0]!.binding[0]!] }],
      },
      janeWorkbook,
      janeParties,
    );
    if (view.kind !== 'climb') throw new Error('expected a climb');
    expect(view.steps[0]!.unlocks).toBe('Fix this one → the last constraint clears (up to SEAL-4).');
    expect(view.headline).toBe('1 answer pins you at SEAL-3');
  });

  it('says why there is no climb instead of rendering a hole', () => {
    const clear = staircaseTile({ ...C, staircase: [] }, janeWorkbook, janeParties);
    expect(clear.kind).toBe('clear');
    if (clear.kind !== 'clear') throw new Error('expected clear');
    expect(clear.floor).toBe(0);
    expect(clear.floorName).toBe('No Sovereignty');
    expect(clear.reason).toBe(
      'Clear — every gating answer sits at SEAL-4, so nothing caps the estate.',
    );

    const none = staircaseTile(
      { ...C, staircase: [], overall: { ...C.overall, floor: null } },
      janeWorkbook,
      janeParties,
    );
    expect(none.kind).toBe('not-assessed');
    if (none.kind !== 'not-assessed') throw new Error('expected not-assessed');
    expect(none.reason).toBe(
      'Not yet assessed — the climb appears once a material gating answer lands.',
    );
  });
});

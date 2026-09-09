import { describe, expect, it } from 'vitest';
import { nextId } from './links';
import { setFrontSheet } from './edit-meta';
import { removeDimension, setStrata, updateDimension } from './edit-dimensions';
import {
  addQuestion,
  addRung,
  moveRung,
  removeRung,
  setGrain,
  updateQuestion,
  updateRung,
  toggleAppliesTo,
  updateObjective,
} from './edit-questions';
import { starterWorkbook } from './starter';

const sov6 = (wb: ReturnType<typeof starterWorkbook>) => wb.objectives.find((o) => o.id === 'SOV-6');
const firstQuestion = (wb: ReturnType<typeof starterWorkbook>) => sov6(wb)?.questions[0];

// One blank dimension question (q-1) applying to compute + storage.
function withAppliesTo() {
  let wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
  wb = toggleAppliesTo(wb, 'q-1', 'compute');
  return toggleAppliesTo(wb, 'q-1', 'storage');
}

const appliesToOf = (wb: ReturnType<typeof starterWorkbook>) => {
  const q = firstQuestion(wb);
  if (q?.grain !== 'dimension') throw new Error('expected a dimension question');
  return q.appliesTo;
};

describe('nextId', () => {
  it('fills the first gap in the sequence', () => {
    expect(nextId([], 'q')).toBe('q-1');
    expect(nextId(['q-1', 'q-3'], 'q')).toBe('q-2');
    expect(nextId(['x'], 'q')).toBe('q-1');
  });
});

describe('addQuestion', () => {
  it('seeds a draft-blank question of the asked grain', () => {
    expect(sov6(addQuestion(starterWorkbook(), 'SOV-6', 'dimension'))?.questions).toEqual([
      {
        id: 'q-1',
        grain: 'dimension',
        appliesTo: [],
        text: '',
        role: 'ARCH',
        defaultMateriality: 'material',
        ladder: [],
      },
    ]);

    const partyQ = firstQuestion(addQuestion(starterWorkbook(), 'SOV-6', 'party'));
    expect(partyQ).toEqual({
      id: 'q-1',
      grain: 'party',
      axis: 'assessment',
      text: '',
      role: 'ARCH',
      defaultMateriality: 'material',
      ladder: [],
    });
    expect(partyQ && 'appliesTo' in partyQ).toBe(false);
  });

  it('seeds the workbook’s first role, not a hard-coded ARCH', () => {
    const dpoWb = { ...starterWorkbook(), roles: [{ id: 'DPO', name: 'Data protection officer' }] };
    expect(firstQuestion(addQuestion(dpoWb, 'SOV-6', 'dimension'))?.role).toBe('DPO');
  });

  it('seeds an empty role when the workbook has no roles', () => {
    const noRoles = { ...starterWorkbook(), roles: [] };
    expect(firstQuestion(addQuestion(noRoles, 'SOV-6', 'party'))?.role).toBe('');
  });
});

describe('dimension edits cascade into the questions', () => {
  it('updateDimension renames cascade into appliesTo', () => {
    const renamed = updateDimension(withAppliesTo(), 'compute', { id: 'metal' });
    expect(renamed.dimensions.map((d) => d.id)).toContain('metal');
    expect(renamed.dimensions.map((d) => d.id)).not.toContain('compute');
    expect(appliesToOf(renamed)).toEqual(['metal', 'storage']);
  });

  it('removeDimension strips appliesTo but keeps the question', () => {
    const removed = removeDimension(withAppliesTo(), 'compute');
    expect(removed.dimensions.length).toBe(9);
    expect(appliesToOf(removed)).toEqual(['storage']);
  });

  it('setStrata [] drops the key', () => {
    const wb = starterWorkbook();
    const dropped = setStrata(wb, 'compute', []);
    const compute = dropped.dimensions.find((d) => d.id === 'compute');
    expect(compute && 'strata' in compute).toBe(false);
    expect(setStrata(wb, 'network', ['a', 'b']).dimensions.find((d) => d.id === 'network')?.strata).toEqual(['a', 'b']);
  });

  it('toggleAppliesTo adds then removes', () => {
    let wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    wb = toggleAppliesTo(wb, 'q-1', 'iam');
    expect(appliesToOf(wb)).toEqual(['iam']);
    wb = toggleAppliesTo(wb, 'q-1', 'iam');
    expect(appliesToOf(wb)).toEqual([]);
  });
});

describe('rung list edits', () => {
  // q-1 with a two-rung ladder: bottom at SEAL-0, top at SEAL-4.
  function twoRung() {
    let wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    wb = addRung(wb, 'q-1');
    wb = updateRung(wb, 'q-1', 'choice-1', { description: 'bottom' });
    wb = addRung(wb, 'q-1');
    wb = updateRung(wb, 'q-1', 'choice-2', { description: 'top', points: 100, seal: 4 });
    return wb;
  }

  // twoRung() plus a third rung at the top: choice-1 / choice-2 / choice-3.
  function threeRung() {
    return updateRung(addRung(twoRung(), 'q-1'), 'q-1', 'choice-3', { description: 'peak', points: 200 });
  }

  const ladderOf = (wb: ReturnType<typeof starterWorkbook>) => firstQuestion(wb)?.ladder ?? [];

  it('the first addRung mints choice-1 blank at the ladder floor', () => {
    const wb = addRung(addQuestion(starterWorkbook(), 'SOV-6', 'dimension'), 'q-1');
    expect(ladderOf(wb)).toEqual([{ id: 'choice-1', description: '', points: 0, seal: 0 }]);
  });

  it('addRung appends at the current top’s points and SEAL', () => {
    expect(ladderOf(addRung(twoRung(), 'q-1'))).toEqual([
      { id: 'choice-1', description: 'bottom', points: 0, seal: 0 },
      { id: 'choice-2', description: 'top', points: 100, seal: 4 },
      { id: 'choice-3', description: '', points: 100, seal: 4 },
    ]);
  });

  it('a new rung never collides with a surviving id', () => {
    const wb = addRung(removeRung(threeRung(), 'q-1', 'choice-2'), 'q-1');
    expect(ladderOf(wb).map((r) => r.id)).toEqual(['choice-1', 'choice-3', 'choice-4']);
  });

  it('a trailing id freed by a removal is re-minted', () => {
    const wb = addRung(removeRung(twoRung(), 'q-1', 'choice-2'), 'q-1');
    expect(ladderOf(wb)).toEqual([
      { id: 'choice-1', description: 'bottom', points: 0, seal: 0 },
      { id: 'choice-2', description: '', points: 0, seal: 0 },
    ]);
  });

  it('updateRung patches in place and never reorders', () => {
    expect(ladderOf(updateRung(twoRung(), 'q-1', 'choice-1', { points: 41.67 }))[0]).toEqual({
      id: 'choice-1',
      description: 'bottom',
      points: 41.67,
      seal: 0,
    });
    expect(ladderOf(updateRung(twoRung(), 'q-1', 'choice-1', { seal: 4 })).map((r) => r.id)).toEqual([
      'choice-1',
      'choice-2',
    ]);
  });

  it('clearing a rung’s text keeps the rung', () => {
    const ladder = ladderOf(updateRung(twoRung(), 'q-1', 'choice-1', { description: '' }));
    expect(ladder.map((r) => r.id)).toEqual(['choice-1', 'choice-2']);
    expect(ladder[0].description).toBe('');
  });

  it('removeRung drops it; an unknown id is a no-op', () => {
    expect(ladderOf(removeRung(twoRung(), 'q-1', 'choice-1')).map((r) => r.id)).toEqual(['choice-2']);
    expect(removeRung(twoRung(), 'q-1', 'choice-9')).toEqual(twoRung());
  });

  it('moveRung swaps neighbours and no-ops at the ends', () => {
    expect(ladderOf(moveRung(twoRung(), 'q-1', 'choice-2', 'earlier')).map((r) => r.id)).toEqual([
      'choice-2',
      'choice-1',
    ]);
    expect(moveRung(twoRung(), 'q-1', 'choice-1', 'earlier')).toEqual(twoRung());
    expect(moveRung(twoRung(), 'q-1', 'choice-2', 'later')).toEqual(twoRung());
    expect(moveRung(twoRung(), 'q-1', 'choice-9', 'earlier')).toEqual(twoRung());
  });
});

describe('optional prose keys', () => {
  it('updateQuestion drops an emptied why and sets a written one', () => {
    const wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    const cleared = firstQuestion(updateQuestion(wb, 'q-1', { why: '' }));
    expect(cleared && 'why' in cleared).toBe(false);
    expect(firstQuestion(updateQuestion(wb, 'q-1', { why: 'w' }))?.why).toBe('w');
  });

  it('addQuestion seeds no why key', () => {
    const q = firstQuestion(addQuestion(starterWorkbook(), 'SOV-6', 'dimension'));
    expect(q && 'why' in q).toBe(false);
  });

  it('setGrain carries a why across, and carries its absence across', () => {
    const wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    const converted = firstQuestion(setGrain(wb, 'q-1', 'party'));
    expect(converted && 'why' in converted).toBe(false);
    const withWhy = updateQuestion(wb, 'q-1', { why: 'w' });
    expect(firstQuestion(setGrain(withWhy, 'q-1', 'party'))?.why).toBe('w');
  });

  it('updateObjective sets a description and drops an emptied one', () => {
    const wb = starterWorkbook();
    const set = updateObjective(wb, 'SOV-6', { description: 'x' });
    expect(set.objectives.find((o) => o.id === 'SOV-6')?.description).toBe('x');
    const cleared = updateObjective(set, 'SOV-6', { description: '' });
    const objective = cleared.objectives.find((o) => o.id === 'SOV-6');
    expect(objective && 'description' in objective).toBe(false);
  });
});

describe('setGrain', () => {
  it('converts and preserves the shared fields', () => {
    let wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    wb = addRung(wb, 'q-1');
    wb = updateRung(wb, 'q-1', 'choice-1', { description: 'r0' });

    const asParty = setGrain(wb, 'q-1', 'party');
    const partyQ = firstQuestion(asParty);
    if (partyQ?.grain !== 'party') throw new Error('expected a party question');
    expect(partyQ).toEqual({
      id: 'q-1',
      grain: 'party',
      axis: 'assessment',
      text: '',
      role: 'ARCH',
      defaultMateriality: 'material',
      ladder: [{ id: 'choice-1', description: 'r0', points: 0, seal: 0 }],
    });
    expect('appliesTo' in partyQ).toBe(false);

    const backToDimension = firstQuestion(setGrain(asParty, 'q-1', 'dimension'));
    if (backToDimension?.grain !== 'dimension') throw new Error('expected a dimension question');
    expect(backToDimension.appliesTo).toEqual([]);
    expect('axis' in backToDimension).toBe(false);

    expect(firstQuestion(setGrain(wb, 'q-1', 'dimension'))).toBe(firstQuestion(wb));
  });
});

describe('setFrontSheet (S11, audit R-7)', () => {
  it('replaces the lines immutably', () => {
    const wb = starterWorkbook();
    const next = setFrontSheet(wb, ['Ceiling declared.', 'Blank is honest.']);
    expect(next.frontSheet).toEqual(['Ceiling declared.', 'Blank is honest.']);
    expect(next).not.toBe(wb);
    expect(wb.frontSheet).toEqual([]);
  });
});

describe('question and dimension ops never mutate their input', () => {
  it('leaves the workbook it was handed untouched', () => {
    const fixture = withAppliesTo();
    const clone = structuredClone(fixture);
    removeDimension(fixture, 'compute');
    addRung(fixture, 'q-1');
    updateObjective(fixture, 'SOV-6', { weight: 99 });
    expect(fixture).toEqual(clone);
  });
});

import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { addRole, questionsUsingRole, removeRole, updateRole } from './edit-roles';
import { addQuestion, updateQuestion } from './edit-questions';
import { starterWorkbook } from './starter';

/** q-1 keeps the seeded ARCH; q-2 is reassigned to OPS. */
function withRoleRefs(): Workbook {
  let wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
  wb = addQuestion(wb, 'SOV-6', 'dimension');
  return updateQuestion(wb, 'q-2', { role: 'OPS' });
}

describe('role edits', () => {
  it('addRole appends a blank role with an auto id', () => {
    const wb = addRole(starterWorkbook());
    expect(wb.roles.length).toBe(7);
    expect(wb.roles.at(-1)).toEqual({ id: 'role-1', name: 'New role' });
  });

  it('updateRole patches name and sets description', () => {
    const named = updateRole(starterWorkbook(), 'OPS', { name: 'Operations' });
    expect(named.roles.find((r) => r.id === 'OPS')?.name).toBe('Operations');
    const glossed = updateRole(starterWorkbook(), 'OPS', { description: 'Runs it' });
    expect(glossed.roles.find((r) => r.id === 'OPS')?.description).toBe('Runs it');
  });

  it('updateRole with an empty description drops the key', () => {
    const arch = updateRole(starterWorkbook(), 'ARCH', { description: '' }).roles.find((r) => r.id === 'ARCH');
    expect(arch && 'description' in arch).toBe(false);
  });

  it('updateRole renames an unreferenced id with no question rewrite', () => {
    const renamed = updateRole(starterWorkbook(), 'FAC', { id: 'ESG' });
    expect(renamed.roles.map((r) => r.id)).toContain('ESG');
    expect(renamed.roles.map((r) => r.id)).not.toContain('FAC');
  });

  it('questionsUsingRole lists referencing question ids in workbook order', () => {
    const wb = withRoleRefs();
    expect(questionsUsingRole(wb, 'ARCH')).toEqual(['q-1']);
    expect(questionsUsingRole(wb, 'OPS')).toEqual(['q-2']);
    expect(questionsUsingRole(wb, 'SEC')).toEqual([]);
  });

  it('removeRole removes an unreferenced role', () => {
    const wb = removeRole(starterWorkbook(), 'FAC');
    expect(wb.roles.map((r) => r.id)).not.toContain('FAC');
    expect(wb.roles.length).toBe(5);
  });

  it('removeRole is a no-op while the role is referenced', () => {
    const wb = addQuestion(starterWorkbook(), 'SOV-6', 'dimension');
    expect(removeRole(wb, 'ARCH')).toEqual(wb);
  });

  it('the S2 authoring flow: add → assign → delete blocked → reassign → delete', () => {
    let wb = addRole(starterWorkbook());
    wb = updateRole(wb, 'role-1', { id: 'DPO', name: 'Data protection officer' });
    wb = addQuestion(wb, 'SOV-6', 'dimension');
    wb = updateQuestion(wb, 'q-1', { role: 'DPO' });
    expect(questionsUsingRole(wb, 'DPO')).toEqual(['q-1']);
    expect(removeRole(wb, 'DPO')).toEqual(wb);
    wb = updateQuestion(wb, 'q-1', { role: 'ARCH' });
    expect(removeRole(wb, 'DPO').roles.map((r) => r.id)).not.toContain('DPO');
  });

  it('never mutate their input', () => {
    const fixture = withRoleRefs();
    const clone = structuredClone(fixture);
    addRole(fixture);
    updateRole(fixture, 'ARCH', { name: 'x', description: '' });
    removeRole(fixture, 'SEC');
    expect(fixture).toEqual(clone);
  });
});

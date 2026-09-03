import type { RoleDef, Workbook } from '../schema';
import { nextId } from './links';

// --- roles (spec docs/specs/roles.md §4; twins of the dimension ops) --------

// A new role, blank: an auto id (`role-N`) the author renames to the real code
// while it is unreferenced, and a placeholder name. No description on add —
// it is optional and filled inline. Twin of addDimension.
export function addRole(wb: Workbook): Workbook {
  const id = nextId(wb.roles.map((r) => r.id), 'role');
  return { ...wb, roles: [...wb.roles, { id, name: 'New role' }] };
}

// Patch a role's fields in place. A referenced id never changes (the editor
// freezes the code input once a question uses the role), so — unlike a
// dimension rename — there is NO cascade into questions here. Clearing the
// description DROPS the key (RoleDefSchema forbids an empty-string description;
// exactOptionalPropertyTypes: the key is absent, never undefined), the same way
// setStrata drops an empty strata array.
export function updateRole(
  wb: Workbook,
  roleId: string,
  patch: Partial<Pick<RoleDef, 'id' | 'name' | 'description'>>,
): Workbook {
  return {
    ...wb,
    roles: wb.roles.map((r) => {
      if (r.id !== roleId) return r;
      const next = { ...r, ...patch };
      if (patch.description === '') {
        const { description: _drop, ...rest } = next;
        return rest;
      }
      return next;
    }),
  };
}

// The ids of every question that names this role, in workbook order. The editor
// reads it to freeze the code, list the blockers, and gate delete.
export function questionsUsingRole(wb: Workbook, roleId: string): string[] {
  return wb.objectives.flatMap((o) =>
    o.questions.filter((q) => q.role === roleId).map((q) => q.id),
  );
}

// Delete a role — BLOCKED (a no-op returning the same workbook) while any
// question references it, because question.role is single and required, so
// stripping it (as removeDimension strips a multi-valued appliesTo) would orphan
// the question. The editor disables delete in that state; this is the core
// guarantee behind it (spec §4, invariant #4).
export function removeRole(wb: Workbook, roleId: string): Workbook {
  if (questionsUsingRole(wb, roleId).length > 0) return wb;
  return { ...wb, roles: wb.roles.filter((r) => r.id !== roleId) };
}

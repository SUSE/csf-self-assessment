import type { PartyType, Workbook } from '../schema';
import { nextId } from './links';

// --- party types (spec docs/specs/parties.md §4; twins of the dimension/role ops) ---

// A new party type, blank: an auto id (`party-N`) the author renames inline, a
// placeholder name, and `kind:'third-party'` — a new type is NEVER the assessed
// party, so adding one can never break "exactly one assessed" (invariant #2).
// The `: PartyType` annotation pins `kind` to the PartyKind union (no widening,
// no cast). Twin of addRole.
export function addParty(wb: Workbook): Workbook {
  const id = nextId(wb.parties.map((p) => p.id), 'party');
  const party: PartyType = { id, name: 'New party type', kind: 'third-party' };
  return { ...wb, parties: [...wb.parties, party] };
}

// Patch a party type's id/name/description. `kind` is intentionally ABSENT from
// the patch — it moves ONLY through setAssessedParty, so no update can ever
// create zero or two assessed types. Renaming the id CASCADES into every test
// estate's concrete-party `type` (a test estate is the one in-workbook place
// that references a party type; leaving a dangling `type` would break R17) — the
// twin of updateDimension's cascade. Clearing the description DROPS the key
// (PartyTypeSchema forbids an empty-string description; exactOptionalPropertyTypes
// — the key is absent, never undefined), the twin of updateRole.
export function updateParty(
  wb: Workbook,
  partyId: string,
  patch: Partial<Pick<PartyType, 'id' | 'name' | 'description'>>,
): Workbook {
  const next = {
    ...wb,
    parties: wb.parties.map((p) => {
      if (p.id !== partyId) return p;
      const merged = { ...p, ...patch };
      if (patch.description === '') {
        const { description: _drop, ...rest } = merged;
        return rest;
      }
      return merged;
    }),
  };
  if (patch.id === undefined || patch.id === partyId) return next;
  const renamed = patch.id;
  return {
    ...next,
    testEstates: next.testEstates.map((e) => ({
      ...e,
      parties: e.parties.map((cp) => (cp.type === partyId ? { ...cp, type: renamed } : cp)),
    })),
  };
}

// Move the single `assessed` flag to `partyId`, demoting whoever held it to
// `third-party` (spec §4 — kind is a single-select; exactly one assessed always).
// This is the ONLY op that changes a kind. Idempotent when partyId is already
// assessed; a no-op for an unknown id (keeps the current assessed). The
// `: PartyType` annotation contextually types the `kind` ternary to PartyKind.
export function setAssessedParty(wb: Workbook, partyId: string): Workbook {
  if (!wb.parties.some((p) => p.id === partyId)) return wb;
  return {
    ...wb,
    parties: wb.parties.map((p): PartyType => ({
      ...p,
      kind: p.id === partyId ? 'assessed' : 'third-party',
    })),
  };
}

// Delete a party type. BLOCKED (a no-op returning the same workbook) for the sole
// assessed type — every instrument needs its one assessed party (spec §4,
// invariant #2); the editor renders "delete blocked" for it. Otherwise a free
// delete that CASCADES: it also drops the concrete parties of that type from
// every test estate (the twin of removeDimension's cascade — a test estate's
// `type` reference must not dangle, R17). Test-estate answers carry no party
// target, so no answer cascade is needed. An unknown id is a no-op.
export function removeParty(wb: Workbook, partyId: string): Workbook {
  const target = wb.parties.find((p) => p.id === partyId);
  if (target === undefined || target.kind === 'assessed') return wb;
  return {
    ...wb,
    parties: wb.parties.filter((p) => p.id !== partyId),
    testEstates: wb.testEstates.map((e) => ({
      ...e,
      parties: e.parties.filter((cp) => cp.type !== partyId),
    })),
  };
}

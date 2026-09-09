import type { Dimension, Workbook } from '../schema';
import { filterLinks, mapQuestions, nextId, renameLinks } from './links';

// The dimension section's edits and their cascades (see./links for the
// preamble).

export function addDimension(wb: Workbook): Workbook {
  const id = nextId(wb.dimensions.map((d) => d.id), 'dim');
  return {
    ...wb,
    dimensions: [...wb.dimensions, { id, name: 'New dimension', critical: false }],
  };
}

// Rename/toggle a dimension. Renaming the ID cascades into every appliesTo
// list AND every test estate's party `serves` — a rename is not a removal.
export function updateDimension(
  wb: Workbook,
  dimensionId: string,
  patch: Partial<Pick<Dimension, 'id' | 'name' | 'critical'>>,
): Workbook {
  const next = {
    ...wb,
    dimensions: wb.dimensions.map((d) => (d.id === dimensionId ? { ...d, ...patch } : d)),
  };
  if (patch.id === undefined || patch.id === dimensionId) return next;
  const renamed = patch.id;
  const requestioned = mapQuestions(next, (q) =>
    q.grain === 'dimension'
      ? { ...q, appliesTo: q.appliesTo.map((d) => (d === dimensionId ? renamed : d)) }
      : q,
  );
  const reserved = {
    ...requestioned,
    testEstates: requestioned.testEstates.map((e) => ({
      ...e,
      parties: e.parties.map((party) => ({
        ...party,
        serves: party.serves.map((d) => (d === dimensionId ? renamed : d)),
      })),
    })),
  };
  return renameLinks(reserved, 'dimension', dimensionId, renamed);
}

// Set the strata a dimension can split into. [] removes the key entirely —
// `strata` is absent for an unsplittable dimension, never an empty array
// (exactOptionalPropertyTypes: the key is dropped, not set to undefined).
export function setStrata(wb: Workbook, dimensionId: string, strata: string[]): Workbook {
  return {
    ...wb,
    dimensions: wb.dimensions.map((d) => {
      if (d.id !== dimensionId) return d;
      const { strata: _drop, ...rest } = d;
      return strata.length === 0 ? rest : { ...rest, strata };
    }),
  };
}

// Remove a dimension and strip it from every appliesTo and every test estate's
// party `serves`. A question left with an empty appliesTo is NOT deleted — it
// turns strict-invalid and glows inline; its new applicability is the author's
// call, not a cascade's.
export function removeDimension(wb: Workbook, dimensionId: string): Workbook {
  const stripped = mapQuestions(wb, (q) =>
    q.grain === 'dimension'
      ? { ...q, appliesTo: q.appliesTo.filter((d) => d !== dimensionId) }
      : q,
  );
  const unlinked = filterLinks(
    stripped,
    (l) => !(l.kind === 'dimension' && l.id === dimensionId),
  );
  return {
    ...unlinked,
    dimensions: unlinked.dimensions.filter((d) => d.id !== dimensionId),
    testEstates: unlinked.testEstates.map((e) => ({
      ...e,
      parties: e.parties.map((party) => ({
        ...party,
        serves: party.serves.filter((d) => d !== dimensionId),
      })),
    })),
  };
}

import type { Workbook, WorkbookMeta } from '../schema';

// The workbook's own header: its meta block, its front sheet, and the
// recommender who stands behind the catalogue (see ./links for the preamble).

export function setWorkbookMeta(wb: Workbook, patch: Partial<WorkbookMeta>): Workbook {
  return { ...wb, meta: { ...wb.meta, ...patch } };
}

// Replace the workbook's front-sheet lines (spec §9 S11, audit R-7).
// Whole-array replacement, immutable like every other edit here.
export function setFrontSheet(wb: Workbook, lines: string[]): Workbook {
  return { ...wb, frontSheet: lines };
}

// The recommender block's editable shape. `contact` is flattened into its two
// halves so each input in the form emits exactly ONE field; the both-or-neither
// rule lives in `setRecommender`, never in the component. An absent key means
// "leave alone"; an empty string means "clear".
export type RecommenderPatch = Partial<{
  name: string;
  disclosure: string;
  contactLabel: string;
  contactUrl: string;
}>;

// Create or patch the workbook's recommender block (spec §2.4, R21). A `contact`
// key exists as soon as EITHER half is non-empty — the missing half stays '',
// which is strict-invalid and glows, because the author is mid-typing, not done.
// When name, disclosure and both halves are empty the whole `recommender` key is
// DROPPED, the way setStrata([]) drops `strata` (exactOptionalPropertyTypes: the
// key is absent, never undefined).
export function setRecommender(wb: Workbook, patch: RecommenderPatch): Workbook {
  const current = wb.recommender ?? { name: '', disclosure: '' };
  const name = patch.name ?? current.name;
  const disclosure = patch.disclosure ?? current.disclosure;
  const label = patch.contactLabel ?? current.contact?.label ?? '';
  const url = patch.contactUrl ?? current.contact?.url ?? '';
  if (name === '' && disclosure === '' && label === '' && url === '') {
    const { recommender: _drop, ...rest } = wb;
    return rest;
  }
  return {
    ...wb,
    recommender:
      label === '' && url === ''
        ? { name, disclosure }
        : { name, disclosure, contact: { label, url } },
  };
}

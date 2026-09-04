// What sits PAST the section tabs and covers whichever section is behind it
// (report.md §4.1). One field rather than a boolean per destination, so two can
// never be open at once. The Report is NOT one of these: it prints rather than
// showing, so it is an action with no view to restore.
export type FacilitatorOverlayKind = 'recommendations';

// The order the toolbar renders them in, and the set a restored view may name.
// They render PAST the last section, so on the carousel axis they follow every
// entry in FACILITATOR_SECTIONS.
export const FACILITATOR_OVERLAYS: readonly FacilitatorOverlayKind[] = ['recommendations'];

export function isFacilitatorOverlayKind(raw: unknown): raw is FacilitatorOverlayKind {
  return FACILITATOR_OVERLAYS.some((overlay) => overlay === raw);
}

// The facilitator's content-navigation sections, the facilitator-app twin of the
// assessor's AssessmentSection and the Author workbench's SectionNav. The
// facilitator imports the author's workbook and walks it left to right: INSPECT
// the instrument (overview → front sheet → objectives → dimensions → roles →
// party types), SEED the estate's concrete providers (parties), name and export
// the workbook-assessment (setup), then MERGE the returned partials (merge). The
// trailing questions navigator is the read-only walk of the instrument's
// questions. The toolbar switches between them; each renders in the stage region.
export type FacilitatorSection =
  | 'overview'
  | 'frontsheet'
  | 'objectives'
  | 'dimensions'
  | 'roles'
  | 'party-types'
  | 'parties'
  | 'setup'
  | 'merge'
  | 'dashboard'
  | 'questions';

// The walk order: the toolbar's tab order, the stage carousel's direction axis, and
// the set a restored view may name. One source of truth — the app keeps no copy.
//
// It must stay in LEFT-TO-RIGHT icon order, because the carousel reads its index
// to decide which way the stage slides: a later entry enters from the right. The
// toolbar splits it into three groups (lead | TRAILING | REPORTING) and each
// group keeps this relative order, so the last four read `setup, questions,
// merge, dashboard` on screen and must read that here too.
export const FACILITATOR_SECTIONS: readonly FacilitatorSection[] = [
  'overview',
  'frontsheet',
  'objectives',
  'dimensions',
  'roles',
  'party-types',
  'parties',
  'setup',
  'questions',
  'merge',
  'dashboard',
];

export function isFacilitatorSection(raw: unknown): raw is FacilitatorSection {
  return FACILITATOR_SECTIONS.some((section) => section === raw);
}

// The inspection sections read the workbook read-only (WorkbookInspector renders
// them); the rest are estate/workflow surfaces the app wires (EstateSetup, the
// seeded-parties view, MergeScreen).
export const INSPECTION_SECTIONS: FacilitatorSection[] = [
  'overview',
  'frontsheet',
  'objectives',
  'dimensions',
  'roles',
  'party-types',
  'questions',
];

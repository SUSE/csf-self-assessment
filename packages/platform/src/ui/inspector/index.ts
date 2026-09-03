export { default as InspectorPanel } from './inspector-panel.svelte';
export { default as ChipInspection } from './chip-inspection.svelte';
export { default as ContributorInspection } from './contributor-inspection.svelte';
export { default as DontKnowInspection } from './dont-know-inspection.svelte';
export { default as EstateSpokeInspection } from './estate-spoke-inspection.svelte';
export { default as EvidenceInspection } from './evidence-inspection.svelte';
// The group-by-objective face, for any rail listing questions from across the instrument.
export { default as ObjectiveGroups } from './objective-groups.svelte';
export { byObjective, type ObjectiveGroupView } from './question-blocks';
export { default as OpenUnitsInspection } from './open-units-inspection.svelte';
export { default as HeatMarkInspection } from './heat-mark-inspection.svelte';
export { default as ObjectiveInspection } from './objective-inspection.svelte';
export { default as ProvenanceInspection } from './provenance-inspection.svelte';
export { default as ReadingInspection } from './reading-inspection.svelte';
export { default as RecommendationInspection } from './recommendation-inspection.svelte';
export { default as SecondLookInspection } from './second-look-inspection.svelte';
export { default as StaircaseRungInspection } from './staircase-rung-inspection.svelte';
// Exported so a view can show the same line the panel would: a view whose subject
// resolves to nothing (a question the workbook no longer has) says what to click,
// rather than rendering an empty rail.
export { default as InspectorHint } from './inspector-hint.svelte';
export { createInspector, getInspector, InspectorSession } from './inspector.svelte';
export {
  InspectSelectionSchema,
  isInspectSelection,
  sameSelection,
  inspectorTitle,
  type AmbientSubject,
  type InspectKind,
  type InspectSelection,
  type InspectSubject,
  type InspectorViews,
} from './subject';

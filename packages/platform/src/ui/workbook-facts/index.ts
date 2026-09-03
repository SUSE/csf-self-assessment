// The workbook, READ-ONLY: one component per set of facts an imported workbook
// carries. The facilitator's WorkbookInspector composes these behind its toolbar
// sections; anything else that has to SHOW a workbook rather than edit it (an
// author preview, a participant's "what am I answering" page) composes the same
// pieces. The editable twins live in ui/workbench, and the two share their table
// shell (ui/record-table) and the workbook meta spec (./meta-fields), so a fact
// looks the same with and without its inputs.
export { default as WorkbookOverview } from './workbook-overview.svelte';
export { default as WorkbookMetaFacts } from './workbook-meta-facts.svelte';
export { default as FrontSheetCard } from './front-sheet-card.svelte';
export { default as ObjectiveList } from './objective-list.svelte';
export { default as ObjectiveRow } from './objective-row.svelte';
export { default as ObjectiveHeading } from './objective-heading.svelte';
export { default as SealLadder } from './seal-ladder.svelte';
export { default as DimensionTable } from './dimension-table.svelte';
export { default as RoleTable } from './role-table.svelte';
export { default as PartyTypeTable } from './party-type-table.svelte';
export { default as PartyKindBadge } from './party-kind-badge.svelte';
export { default as QuestionList } from './question-list.svelte';
export { default as QuestionRow } from './question-row.svelte';
export { META_FIELDS, metaValue, type MetaFieldSpec } from './meta-fields';

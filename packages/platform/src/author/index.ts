// The Author app's pure core (spec §4.3c / §9 S9, S9b): structural gauges,
// the quality gauges (duplicate radar, ladder lint, test estates), the
// starter definition, and the workbook edit ops. DOM-free like the engine —
// enforced by the same eslint rule (see eslint.config.js).
export {
  DEFAULT_PARTY_COUNT,
  MINUTES_EXTRA_UNIT,
  MINUTES_FIRST_UNIT,
  MINUTES_TARGET,
  QUESTION_TARGET,
  authorGauges,
} from './gauges';
export type {
  AuthorGauges,
  BudgetGauge,
  CoverageCell,
  CoverageGauge,
  GateEntry,
  GateVia,
  RoleLoad,
  RoleReadout,
} from './gauges';
export {
  DUPLICATE_PAIR_CAP,
  DUPLICATE_WARN_THRESHOLD,
  duplicateRadar,
  jaccard,
  questionTokens,
} from './similarity';
export type { DuplicateWarning } from './similarity';
export { HEDGED_QUANTIFIERS, ladderLint } from './lint';
export type { LintFinding, QuestionLint } from './lint';
export { estateAnswers, estateFloorFlips, evaluateTestEstate, testEstateReadings } from './estates';
export type { EstateFloorFlip, TestEstateEvaluation, TestEstateReading } from './estates';
export { NO_ESTATES_REASON, recommendationReadout } from './recommendation-readout';
export type {
  EstateFiring,
  ReadoutRecommendation,
  RecommendationReadout,
} from './recommendation-readout';
export {
  NO_RECOMMENDATION_FILTER,
  filterRecommendationRows,
  isRecommendationFilterNarrowed,
  recommendationFacets,
  recommendationFilterSummary,
  recommendationOptionName,
  recommendationRows,
} from './recommendation-list';
export type {
  RecommendationFacets,
  RecommendationFilter,
  RecommendationLinkage,
  RecommendationOption,
  RecommendationRow,
} from './recommendation-list';
export { starterWorkbook } from './starter';
export { nextId } from './links';
export { setFrontSheet, setRecommender, setWorkbookMeta } from './edit-meta';
export type { RecommenderPatch } from './edit-meta';
export { addDimension, removeDimension, setStrata, updateDimension } from './edit-dimensions';
export { addRole, questionsUsingRole, removeRole, updateRole } from './edit-roles';
export { addParty, removeParty, setAssessedParty, updateParty } from './edit-parties';
export {
  LINK_KIND_LABELS,
  LINK_KINDS,
  addRecommendation,
  linkRecommendation,
  linkStanding,
  linkTargets,
  removeRecommendation,
  setRecommendationBody,
  unlinkRecommendation,
  updateRecommendation,
} from './edit-recommendations';
export type {
  LinkStanding,
  LinkTarget,
  RecommendationLinkKind,
} from './edit-recommendations';
export {
  addObjective,
  addQuestion,
  addRung,
  moveRung,
  removeObjective,
  removeQuestion,
  removeRung,
  setAxis,
  setGrain,
  toggleAppliesTo,
  updateObjective,
  updateQuestion,
  updateRung,
} from './edit-questions';
export type { RungMove, RungPatch } from './edit-questions';
export {
  addTestEstate,
  clearEstateAnswer,
  removeTestEstate,
  setEstateAnswer,
  updateTestEstate,
} from './edit-estates';

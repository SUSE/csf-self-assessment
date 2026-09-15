import { z } from 'zod';
import {
  PartySchema,
  PartyTypeSchema,
  RoleDefSchema,
  SealSchema,
  MaterialitySchema,
} from './primitives';
import { refineWorkbook } from './workbook-rules';

// The instrument: what an author writes. Cross-record rules R1–R21 live in
// ./workbook-rules and are attached at the bottom of this file.

export const WorkbookMetaSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
});

export const SealLevelSchema = z.object({
  seal: SealSchema,
  name: z.string().min(1),
  description: z.string().min(1),
});

// A canonical technical dimension. `strata` names the layers it can split into
// . absent = unsplittable. `critical` is the FIRM authored flag the
// SEAL gate reads directly — every authored dimension is in
// scope, so there is no "declared" flag and no structural n/a.
export const DimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  strata: z.array(z.string().min(1)).optional(),
  critical: z.boolean().default(false),
});

// A rung is a thing in its own right: a frozen id, its text, its
// authored points (the ranking currency) and its SEAL tag (the gating axis).
// Neither axis is derived from the other; neither identifies the rung.
export const RungSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  points: z.number().min(0),
  seal: SealSchema,
});

const LADDER_MIN = { message: 'Add at least one rung — a SEAL level with a description.' };

// Party grain: asked about parties, not per dimension. `axis` decides the fan-out
// — `assessment` = once for the estate, `party` = one answer per declared party.
export const PartyQuestionSchema = z.object({
  id: z.string().min(1),
  grain: z.literal('party'),
  axis: z.enum(['assessment', 'party']).default('assessment'),
  text: z.string().min(1),
  why: z.string().min(1).optional(),
  role: z.string().min(1),
  defaultMateriality: MaterialitySchema,
  ladder: z.array(RungSchema).min(1, LADDER_MIN),
});

// Dimension grain: answered once per applicable dimension, which `appliesTo`
// names (grain↔appliesTo consistency, ).
export const DimensionQuestionSchema = z.object({
  id: z.string().min(1),
  grain: z.literal('dimension'),
  appliesTo: z.array(z.string().min(1)).min(1, {
    message: 'Pick at least one dimension this question applies to.',
  }),
  text: z.string().min(1),
  why: z.string().min(1).optional(),
  role: z.string().min(1),
  defaultMateriality: MaterialitySchema,
  ladder: z.array(RungSchema).min(1, LADDER_MIN),
});

export const QuestionSchema = z.discriminatedUnion('grain', [
  PartyQuestionSchema,
  DimensionQuestionSchema,
]);

export const ObjectiveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Optional: a required '' would be a lie. Absent = no description.
  description: z.string().min(1).optional(),
  weight: z.number().int().min(0).max(100),
  questions: z.array(QuestionSchema).min(1, {
    message: 'Add at least one question to this objective.',
  }),
});

// --- test estates --------------------------------------------------------
// Test estates carry SPARSE per-question answers — "which rung would this estate
// honestly pick?". A question with no entry is unanswered for that estate: it
// sits in the score's denominator but never floors, so a floor can only flip
// through an answer the author explicitly placed.

export const TestEstateAnswerSchema = z.object({
  questionId: z.string().min(1),
  rungId: z.string().min(1),
});

// A reference estate the author tests the workbook against: a name + story, its
// concrete PARTIES (for the exposure map), and sparse answers. Every workbook
// dimension is in scope and criticality is authored, so there is
// no per-estate profile. Workbook data; the participant app ignores it.
export const TestEstateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  parties: z.array(PartySchema).default([]),
  answers: z.array(TestEstateAnswerSchema).default([]),
});

// --- recommendations -----------------------------------------------------

// The authored band a recommendation belongs to, 1:1 with the two band tiles —
// the typed replacement for the reference's magic `quick-win` tag.
export const HorizonSchema = z.enum(['renewal', 'strategic']);

// The authored, typed pointer from a recommendation to what it speaks to
// . Several links mean UNION — never a boolean expression.
export const RecommendationLinkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('question'), id: z.string().min(1) }),
  z.object({ kind: z.literal('dimension'), id: z.string().min(1) }),
  z.object({ kind: z.literal('objective'), id: z.string().min(1) }),
]);

// Workbook-authored vendor content (docs/specs/recommendations.md §2.1).
// `body` is one entry per paragraph, a leading '- ' rendering as a bullet.
// `order` is author emphasis WITHIN its band; ties break on `id`. Deliberately
// absent: priority, severity, tags, active, and any condition language.
export const RecommendationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  action: z.string().min(1),
  body: z.array(z.string().min(1)).default([]),
  links: z.array(RecommendationLinkSchema).min(1, {
    message: 'Link this recommendation to at least one question, dimension or objective.',
  }),
  whenAtOrBelow: SealSchema,
  horizon: HorizonSchema,
  order: z.number().int().min(0),
});

// Who is speaking (docs/specs/recommendations.md §2.4): `contact` is ONE
// workbook-level call to action, not a field per card.
export const RecommenderSchema = z.object({
  name: z.string().min(1),
  disclosure: z.string().min(1),
  contact: z.object({ label: z.string().min(1), url: z.string().min(1) }).optional(),
});

// --- the workbook --------------------------------------------------------

const WorkbookFieldsSchema = z.object({
  meta: WorkbookMetaSchema,
  // The instrument's front sheet (audit R-7): opening declarations rendered
  // before answering starts. Workbook data, not schema constants; [] = none.
  frontSheet: z.array(z.string().min(1)).default([]),
  sealLevels: z.array(SealLevelSchema).min(1),
  dimensions: z.array(DimensionSchema).default([]),
  roles: z.array(RoleDefSchema).default([]),
  parties: z.array(PartyTypeSchema).default([]),
  objectives: z.array(ObjectiveSchema).min(1, { message: 'Add at least one objective.' }),
  testEstates: z.array(TestEstateSchema).default([]),
  recommender: RecommenderSchema.optional(),
  recommendations: z.array(RecommendationSchema).default([]),
});

// Declared off the fields schema, not off WorkbookSchema: superRefine leaves the
// output type untouched, and this keeps the rules module free of a type cycle.
export type Workbook = z.infer<typeof WorkbookFieldsSchema>;

export const WorkbookSchema = WorkbookFieldsSchema.superRefine(refineWorkbook);

export type WorkbookMeta = z.infer<typeof WorkbookMetaSchema>;
export type SealLevel = z.infer<typeof SealLevelSchema>;
export type Dimension = z.infer<typeof DimensionSchema>;
export type Rung = z.infer<typeof RungSchema>;
export type PartyQuestion = z.infer<typeof PartyQuestionSchema>;
export type DimensionQuestion = z.infer<typeof DimensionQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type TestEstateAnswer = z.infer<typeof TestEstateAnswerSchema>;
export type TestEstate = z.infer<typeof TestEstateSchema>;
export type Horizon = z.infer<typeof HorizonSchema>;
export type RecommendationLink = z.infer<typeof RecommendationLinkSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type Recommender = z.infer<typeof RecommenderSchema>;

import { z } from 'zod';
import { MaterialitySchema, PartyKindSchema, SealSchema } from './primitives';
import { HorizonSchema, type Workbook } from './workbook';

// The Author app edits a workbook that is legitimately INVALID mid-edit (weights
// not yet 100, an empty ladder while typing, an objective with no questions).
// The draft schema accepts every structurally sound workbook — same tree, same
// discriminants, same defaults — with the content constraints removed, so a saved
// draft can always be reopened. DRAFT_INFERS_WORKBOOK at the bottom of this file
// holds the two shapes in lockstep.

const DraftRungSchema = z.object({
  id: z.string(),
  description: z.string(),
  points: z.number(),
  seal: SealSchema,
});

const DraftPartyQuestionSchema = z.object({
  id: z.string(),
  grain: z.literal('party'),
  axis: z.enum(['assessment', 'party']).default('assessment'),
  text: z.string(),
  why: z.string().optional(),
  role: z.string(),
  defaultMateriality: MaterialitySchema,
  ladder: z.array(DraftRungSchema),
});

const DraftDimensionQuestionSchema = z.object({
  id: z.string(),
  grain: z.literal('dimension'),
  appliesTo: z.array(z.string()),
  text: z.string(),
  why: z.string().optional(),
  role: z.string(),
  defaultMateriality: MaterialitySchema,
  ladder: z.array(DraftRungSchema),
});

const DraftQuestionSchema = z.discriminatedUnion('grain', [
  DraftPartyQuestionSchema,
  DraftDimensionQuestionSchema,
]);

const DraftObjectiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().int(),
  questions: z.array(DraftQuestionSchema),
});

const DraftPartySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  serves: z.array(z.string()).default([]),
});

const DraftTestEstateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parties: z.array(DraftPartySchema).default([]),
  answers: z.array(z.object({ questionId: z.string(), rungId: z.string() })).default([]),
});

const DraftRecommendationLinkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('question'), id: z.string() }),
  z.object({ kind: z.literal('dimension'), id: z.string() }),
  z.object({ kind: z.literal('objective'), id: z.string() }),
]);

const DraftRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  action: z.string(),
  body: z.array(z.string()).default([]),
  links: z.array(DraftRecommendationLinkSchema).default([]),
  whenAtOrBelow: SealSchema,
  horizon: HorizonSchema,
  order: z.number().int(),
});

export const DraftWorkbookSchema = z.object({
  meta: z.object({
    id: z.string(),
    version: z.string(),
    title: z.string(),
  }),
  frontSheet: z.array(z.string()).default([]),
  sealLevels: z.array(z.object({ seal: SealSchema, name: z.string(), description: z.string() })),
  dimensions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        strata: z.array(z.string()).optional(),
        critical: z.boolean().default(false),
      }),
    )
    .default([]),
  roles: z
    .array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }))
    .default([]),
  parties: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        kind: PartyKindSchema,
      }),
    )
    .default([]),
  objectives: z.array(DraftObjectiveSchema),
  testEstates: z.array(DraftTestEstateSchema).default([]),
  recommender: z
    .object({
      name: z.string(),
      disclosure: z.string(),
      contact: z.object({ label: z.string(), url: z.string() }).optional(),
    })
    .optional(),
  recommendations: z.array(DraftRecommendationSchema).default([]),
});

type Identical<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Drift guard, not documentation: a draft must infer to EXACTLY `Workbook` so
// drafts flow through every Workbook-typed function. Change one shape without the
// other and this stops compiling.
export const DRAFT_INFERS_WORKBOOK: Identical<z.infer<typeof DraftWorkbookSchema>, Workbook> =
  true;

// The strict-validation issues at or under a path prefix — how the Author app
// routes WorkbookSchema issues to the component editing that node (a question
// card, an objective header, the dimensions panel). An empty prefix returns all.
export function issuesUnder(issues: z.ZodIssue[], prefix: (string | number)[]): z.ZodIssue[] {
  return issues.filter(
    (issue) =>
      prefix.length <= issue.path.length && prefix.every((p, i) => issue.path[i] === p),
  );
}

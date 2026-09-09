import { z } from 'zod';

// What a participant places on one answer unit: the target it lands on, the
// state, and the gesture that produced it.

// Provenance: group = one uniformity claim over the visible chips.
// individual = a chip placed on its own. The engine scores both identically.
export const GestureSchema = z.object({
  groupId: z.string().min(1),
  placement: z.enum(['group', 'individual']),
});

export const AssessmentTargetSchema = z.object({ kind: z.literal('assessment') });

export const DimensionTargetSchema = z.object({
  kind: z.literal('dimension'),
  dimension: z.string().min(1),
});

// A dimension/stratum refinement. Strata are NOT an axis — the
// refinement always names its parent dimension.
export const DimensionStratumTargetSchema = z.object({
  kind: z.literal('dimension-stratum'),
  dimension: z.string().min(1),
  stratum: z.string().min(1),
});

export const PartyTargetSchema = z.object({
  kind: z.literal('party'),
  party: z.string().min(1),
});

// Grows by ADDING members, never by rewriting the union.
export const TargetSchema = z.discriminatedUnion('kind', [
  AssessmentTargetSchema,
  DimensionTargetSchema,
  DimensionStratumTargetSchema,
  PartyTargetSchema,
]);

export const AnswerSchema = z.discriminatedUnion('state', [
  z.object({
    questionId: z.string().min(1),
    target: TargetSchema,
    state: z.literal('answered'),
    rungId: z.string().min(1),
    // The supporting proof for the chosen rung, attachable at group
    // level so a swept placement repeats one note across its answers. Absent =
    // none recorded, never an empty string. The credibility lens reads its
    // presence; scoring never does.
    evidence: z.string().min(1).optional(),
    gesture: GestureSchema,
  }),
  z.object({
    questionId: z.string().min(1),
    target: TargetSchema,
    state: z.literal('dont-know'),
    gesture: GestureSchema,
  }),
  z.object({
    questionId: z.string().min(1),
    target: TargetSchema,
    state: z.literal('na'),
    // Review-only reason an n/a is excluded. Engine-invisible.
    reason: z.string().min(1).optional(),
    gesture: GestureSchema,
  }),
]);

// The unit-local payload a Landing record stores (landing-history §2.2.4): the
// unit identity lives ONCE on the record, so a snapshot carries only the
// state-specific facts.
export const AnswerSnapshotSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('answered'),
    rungId: z.string().min(1),
    evidence: z.string().min(1).optional(),
    gesture: GestureSchema,
  }),
  z.object({ state: z.literal('dont-know'), gesture: GestureSchema }),
  z.object({
    state: z.literal('na'),
    reason: z.string().min(1).optional(),
    gesture: GestureSchema,
  }),
]);

export type Gesture = z.infer<typeof GestureSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type DimensionTarget = z.infer<typeof DimensionTargetSchema>;
export type DimensionStratumTarget = z.infer<typeof DimensionStratumTargetSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type AnswerSnapshot = z.infer<typeof AnswerSnapshotSchema>;

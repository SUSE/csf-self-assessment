import { z } from 'zod';
import { ClaimSchema, PartySchema } from './primitives';
import { AnswerSchema, AnswerSnapshotSchema, TargetSchema } from './answer';

// The append-only history of a merge (merge.md §2.4/§5, ADR-0011): one record per
// answer unit a landing touched, undisputed ones included. Every candidate
// carries the CLAIM that produced it verbatim, because `claims` is partial-only —
// without it a finalized assessment cannot explain why a candidate won. Scoring
// never reads any of this.

// A candidate's standing, computed from the claim that produced it (merge.md
// §2.3): owner > blanket > out-of-claim. A facilitator's re-answer carries
// `out-of-claim` — no claim covered it.
export const AuthoritySchema = z.enum(['owner', 'blanket', 'out-of-claim']);

// What a RECORD stores for one candidate. The in-review twin is `ReviewCandidate`
// (merge/clash-types.ts), which carries a whole `Answer` because resolution folds it
// onto the base.
export const LedgerCandidateSchema = z.object({
  from: z.string().min(1),
  answer: AnswerSnapshotSchema,
  claim: ClaimSchema.nullable(),
  authority: AuthoritySchema,
});

// The four clash classes (merge.md §2.2). No fifth.
export const ClashClassSchema = z.enum(['divergence', 'gap', 'scope', 'grain']);

export const ClashChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('take'), from: z.string().min(1) }),
  z.object({ kind: z.literal('reanswer'), rungId: z.string().min(1) }),
  // A grain decision keeps ONE depth and empties the other (merge.md §2.2).
  z.object({ kind: z.literal('grain'), keep: z.enum(['strata', 'roll-up']) }),
]);

export const LedgerDecisionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('agreed'),
    among: z.array(z.string().min(1)).min(2),
    kept: z.string().min(1),
  }),
  z.object({ kind: z.literal('sole-source'), from: z.string().min(1) }),
  z.object({
    kind: z.literal('resolved'),
    clash: ClashClassSchema,
    choice: ClashChoiceSchema,
    by: z.string().min(1),
    // Optional by design (merge.md §2.7): the typed choice carries the meaning.
    note: z.string(),
  }),
]);

export const AnswerLedgerRecordSchema = z.object({
  kind: z.literal('answer'),
  questionId: z.string().min(1),
  target: TargetSchema,
  // Stored event facts (§2.2.7): what stood here immediately before and after
  // this Landing. Null = no standing answer, never SEAL-0.
  before: AnswerSnapshotSchema.nullable(),
  after: AnswerSnapshotSchema.nullable(),
  candidates: z.array(LedgerCandidateSchema).min(1),
  decision: LedgerDecisionSchema,
});

// One answer-target rewrite a party decision caused (§2.3.5).
export const TargetRewriteSchema = z.object({
  questionId: z.string().min(1),
  before: TargetSchema,
  after: TargetSchema,
});

// The typed party decisions a Landing records (§2.3.4). `absorb` collapses two
// DIFFERENT ids onto the estate's; `rename` settles a SAME-id collision under the
// facilitator's chosen name; `split` keeps the incoming party under a fresh id;
// `add` is an uncontested addition joining the estate.
export const PartyRecordDecisionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('add'), party: z.string().min(1) }),
  z.object({
    kind: z.literal('absorb'),
    from: z.string().min(1),
    into: z.string().min(1),
    name: z.string().min(1),
    by: z.string().min(1),
    note: z.string(),
  }),
  z.object({
    kind: z.literal('rename'),
    party: z.string().min(1),
    name: z.string().min(1),
    by: z.string().min(1),
    note: z.string(),
  }),
  z.object({
    kind: z.literal('split'),
    from: z.string().min(1),
    id: z.string().min(1),
    by: z.string().min(1),
    note: z.string(),
  }),
]);

// The in-review party choice (merge.md §2.5, invariant #8). `absorb` keeps ONE
// party under the ESTATE's id `into`, displayed under `name` — either side's, the
// facilitator's pick — taking the union of `serves` (invariant #6). `split` keeps
// the incoming addition under its own `id`; `from` names the estate party it was
// weighed against, so the record can say what it was not.
export const PartyChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('absorb'), into: z.string().min(1), name: z.string().min(1) }),
  z.object({ kind: z.literal('split'), id: z.string().min(1), from: z.string().min(1) }),
]);

// One decision on the party axis, keyed by the incoming addition it settles — at
// most one per addition, so a changed mind REPLACES here (upsertPartyDecision)
// and the ledger is what appends (merge.md §2.4.4).
export const PartyDecisionSchema = z.object({
  added: z.string().min(1),
  choice: PartyChoiceSchema,
  note: z.string(),
});

// A `rename` puts two parties carrying the SAME id in `before`, so no id lookup
// can tell the sides apart: POSITION is the contract (§2.3.2, ADR-0015).
// `before` = [estate side, …incoming side]; `after` = the resulting parties.
export const PartyLedgerRecordSchema = z.object({
  kind: z.literal('party'),
  before: z.array(PartySchema),
  after: z.array(PartySchema),
  decision: PartyRecordDecisionSchema,
  affectedTargets: z.array(TargetRewriteSchema),
});

export const LedgerRecordSchema = z.discriminatedUnion('kind', [
  AnswerLedgerRecordSchema,
  PartyLedgerRecordSchema,
]);

// One press of Land (§2.1, ADR-0015). Identity, time, participant and note live
// here and NOWHERE else; the shell stamps id/at (invariant #3).
export const LandingEnvelopeSchema = z.object({
  id: z.string().uuid(),
  at: z.string().min(1),
  participant: z.string().min(1),
  note: z.string().min(1).optional(),
});

export const LandingSchema = LandingEnvelopeSchema.extend({
  records: z.array(LedgerRecordSchema).min(1),
});

// Everything landed so far, anchored to one workbook-assessment (merge.md
// §2.1.1). NOT an assessment: it carries no floor and no score.
export const EstateBaseSchema = z.object({
  parties: z.array(PartySchema).default([]),
  answers: z.array(AnswerSchema).default([]),
});

export const ClashResolutionSchema = z.object({
  questionId: z.string().min(1),
  target: TargetSchema,
  choice: ClashChoiceSchema,
  note: z.string(),
});

export type Authority = z.infer<typeof AuthoritySchema>;
export type LedgerCandidate = z.infer<typeof LedgerCandidateSchema>;
export type ClashClass = z.infer<typeof ClashClassSchema>;
export type ClashChoice = z.infer<typeof ClashChoiceSchema>;
export type LedgerDecision = z.infer<typeof LedgerDecisionSchema>;
export type AnswerLedgerRecord = z.infer<typeof AnswerLedgerRecordSchema>;
export type PartyLedgerRecord = z.infer<typeof PartyLedgerRecordSchema>;
export type LedgerRecord = z.infer<typeof LedgerRecordSchema>;
export type TargetRewrite = z.infer<typeof TargetRewriteSchema>;
export type PartyRecordDecision = z.infer<typeof PartyRecordDecisionSchema>;
export type PartyChoice = z.infer<typeof PartyChoiceSchema>;
export type PartyDecision = z.infer<typeof PartyDecisionSchema>;
export type LandingEnvelope = z.infer<typeof LandingEnvelopeSchema>;
export type Landing = z.infer<typeof LandingSchema>;
export type EstateBase = z.infer<typeof EstateBaseSchema>;
export type ClashResolution = z.infer<typeof ClashResolutionSchema>;

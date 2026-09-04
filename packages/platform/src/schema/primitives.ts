import { z } from 'zod';

// The vocabulary shared by the workbook, the assessment and the merge ledger.
// zod schemas are the single source of truth; every static type is z.infer.

export const SealSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

// A workshop-answerer role (docs/specs/roles.md, ): workbook-authored
// content, the twin of DimensionSchema, not a fixed vocabulary. `id` is the
// stable badge every question.role and claim role resolves against, in the
// OWNING workbook's roles. There is no global set.
export const RoleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
});

// Two independent axes — does it score, does it gate (, instrument.md
// §2.5). Order is the authoring order the workbench offers.
export const MaterialitySchema = z.enum(['material', 'ranking', 'informational', 'na']);

// Identity is the participant's NAME, unique within an estate.
// An in-progress model may carry an empty name; the app requires one only
// before EXPORT, where merge identifies partials by it.
export const ParticipantSchema = z.object({
  name: z.string(),
});

// A claim: one owner-gated slice a participant
// composes to answer. `roles` is the gate; `dimensions ∪ parties` is the
// SUBJECT (OR'd; both empty = everything for those roles).
export const ClaimSchema = z.object({
  roles: z.array(z.string().min(1)).min(1),
  dimensions: z.array(z.string().min(1)).default([]),
  parties: z.array(z.string().min(1)).default([]),
});

// The engine-read structural class of a party type (docs/specs/parties.md
// §2.2): `assessed` = the estate owner, `third-party` = the compellable supply
// chain. The engine branches on `kind`, never on a party-type id.
export const PartyKindSchema = z.enum(['assessed', 'third-party']);

// A workbook-authored party TYPE (docs/specs/parties.md §2.2): a class of party
// in the estate's authority/supply chain, the twin of RoleDefSchema. `id` is the
// badge a concrete party's `type` references. `workbook.parties` is ordered.
export const PartyTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  kind: PartyKindSchema,
});

// A concrete PARTY (docs/specs/parties.md §2.1) is a per-estate fact. `serves`
// is the dimensions it touches — those edges, coloured by the party's
// compellability answer, are the exposure map.
export const PartySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  serves: z.array(z.string().min(1)).default([]),
});

export type Seal = z.infer<typeof SealSchema>;
// A role id, resolved against the owning workbook's `roles`. Not a
// global vocabulary — there is no RoleSchema enum.
export type Role = string;
export type RoleDef = z.infer<typeof RoleDefSchema>;
export type Materiality = z.infer<typeof MaterialitySchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type PartyKind = z.infer<typeof PartyKindSchema>;
export type PartyType = z.infer<typeof PartyTypeSchema>;
export type Party = z.infer<typeof PartySchema>;

// Local persistence for the facilitator's in-progress work, so a page refresh
// resumes exactly where you were ( — offline-safe, no network). The
// third member of the storage family, alongside the assessor's participant store
// (participant-storage.ts) and the Author's workbook draft (workbook-storage.ts).
// The facilitator stage has no view-store entry of its own, so — unlike the
// assessor, whose view lives in history.state — the one facilitator store carries
// both the imported context AND the light view hint (which section) needed to land
// you back where you were. Nothing imported → nothing stored.
import { z } from 'zod';
import {
  WorkbookSchema,
  WorkbookAssessmentSchema,
  AssessmentSchema,
  ClashResolutionSchema,
  EstateBaseSchema,
  LandingSchema,
  PartyDecisionSchema,
  PartySchema,
  AnswerSchema,
} from '../schema';
import { storedSlot } from './stored-slot';

// The merge-in-progress, restored whole so the landing under review — its clash
// resolutions and party decisions — survives a refresh too. Refused files are
// transient (a failed load, not state) and deliberately not persisted.
const MergeSchema = z.object({
  workbookAssessment: WorkbookAssessmentSchema,
  base: EstateBaseSchema,
  ledger: z.array(LandingSchema),
  incoming: AssessmentSchema.nullable(),
  resolutions: z.array(ClashResolutionSchema),
  partyDecisions: z.array(PartyDecisionSchema),
  // The facilitator's note for the landing under review, frozen into the Landing
  // envelope on Land (landing-history §2.6).
  note: z.string(),
});

const PersistedSchema = z.object({
  kind: z.literal('facilitator'),
  // The imported instrument, always a complete workbook (import parses it
  // strictly), plus the estate the facilitator is seeding for it.
  workbook: WorkbookSchema,
  estate: z.string(),
  parties: z.array(PartySchema),
  // Present only when a partial/finalized was imported (drives the Questions
  // page's selected SEALs); empty for a bare workbook or workbook-assessment.
  answers: z.array(AnswerSchema),
  // The ledger of an imported FINALIZED assessment — the estate of record read in
  // the Questions rail. Empty for everything else; a merge keeps its own ledger
  // inside `merge`.
  ledger: z.array(LandingSchema),
  // Which facilitator section was open — a FacilitatorSection, kept as a bare
  // string here so this util doesn't depend on the toolbar component; the App
  // guards it against its section order on restore.
  section: z.string(),
  // The workbook-assessment a directly imported FINALIZED belongs to; null for a
  // bare workbook or while a merge (which carries its own anchor) is live.
  workbookAssessment: z.string().nullable(),
  // Which dashboard tile is maximised — a TileId, kept as a bare string here so
  // this util doesn't depend on the analytics module; the App guards it with
  // isTileId on restore. The facilitator stage has no view-store entry, so its
  // view hints live here (see this file's header).
  maximised: z.string().nullable(),
  merge: MergeSchema.nullable(),
});

// The restored state; null from load() means none stored or no longer parsing.
export type FacilitatorState = z.infer<typeof PersistedSchema>;

export const facilitatorState = storedSlot('csf-facilitator-state', PersistedSchema);

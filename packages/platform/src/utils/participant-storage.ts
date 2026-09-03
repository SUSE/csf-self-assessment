// Local persistence for the participant's in-progress work, so a page refresh
// resumes exactly where you were (invariant #7 — offline-safe, no network). The
// mirror of the Author draft store (see workbook-storage.ts). A loaded
// workbook-assessment is adopted straight into an assessment model (name + claims
// + answers filled independently), so the ONE stored shape is that model. Empty
// stores nothing.
import { z } from 'zod';
import { AssessmentSchema } from '../schema';
import { storedSlot } from './stored-slot';

const PersistedSchema = z.object({
  kind: z.literal('assessment'),
  assessment: AssessmentSchema,
});

// The restored state; null from load() means none stored or no longer parsing.
export type ParticipantState = z.infer<typeof PersistedSchema>;

export const participantState = storedSlot('csf-participant-state', PersistedSchema);

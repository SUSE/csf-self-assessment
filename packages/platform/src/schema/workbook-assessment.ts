import { z } from 'zod';
import { PartySchema } from './primitives';
import { WorkbookSchema } from './workbook';
import { refineEstateParties } from './party-rules';

// The facilitator's distributable artifact (delivery §2.2, ADR-0005): a workbook
// prepared for one named estate, with the seeded parties. The workbook is
// embedded verbatim so the version-match refusal is checkable from the file
// alone. The app shell stamps `id` and `createdAt` — the pure core never reads
// the clock.

export const WorkbookAssessmentMetaSchema = z.object({
  id: z.string().min(1),
  estate: z.string().min(1),
  workbookId: z.string().min(1),
  workbookVersion: z.string().min(1),
  createdAt: z.string().min(1),
});

const WorkbookAssessmentFieldsSchema = z.object({
  meta: WorkbookAssessmentMetaSchema,
  workbook: WorkbookSchema,
  parties: z.array(PartySchema).default([]),
});

export const WorkbookAssessmentSchema = WorkbookAssessmentFieldsSchema.superRefine((wa, ctx) =>
  refineEstateParties(ctx, wa.parties, wa.workbook.parties),
);

export type WorkbookAssessmentMeta = z.infer<typeof WorkbookAssessmentMetaSchema>;
export type WorkbookAssessment = z.infer<typeof WorkbookAssessmentFieldsSchema>;

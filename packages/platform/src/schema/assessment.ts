import { z } from 'zod';
import { ClaimSchema, ParticipantSchema, PartySchema } from './primitives';
import { AnswerSchema } from './answer';
import { LandingSchema } from './landing';
import { WorkbookSchema } from './workbook';
import { assessedTypeIds, refineEstateParties } from './party-rules';

// One participant's filled instrument, or the finalized estate the facilitator
// lands them into. The workbook is embedded verbatim so the version-match
// refusal is checkable from the file alone.

export const AssessmentMetaSchema = z.object({
  workbookId: z.string().min(1),
  workbookVersion: z.string().min(1),
  estate: z.string().min(1),
  // Workshop lineage: EVERY assessment carries its
  // workbook-assessment id. `participant` rides a PARTIAL only; a finalized omits
  // it. There is no lineage-free assessment (the retired 'solo').
  workbookAssessment: z.string().min(1),
  participant: ParticipantSchema.optional(),
});

const AssessmentFieldsSchema = z.object({
  meta: AssessmentMetaSchema,
  workbook: WorkbookSchema,
  // Concrete parties seeded in the workbook-assessment and embedded here
  // . There is no per-assessment profile.
  parties: z.array(PartySchema).default([]),
  // The participant's ordered claims, asserted on a partial and
  // absent on a finalized — the same pattern as meta.participant.
  claims: z.array(ClaimSchema).optional(),
  // The provisional parties a participant adds in context.
  // Ids are namespaced by the participant name; every added party is a THIRD
  // party, since the assessed "us" is seeded, never added.
  partiesAdded: z.array(PartySchema).optional(),
  ledger: z.array(LandingSchema).default([]),
  answers: z.array(AnswerSchema),
});

export const AssessmentSchema = AssessmentFieldsSchema.superRefine((assessment, ctx) => {
  // Two shapes, no third: these markers travel
  // together, so an assessment is a PARTIAL (all of them) or a FINALIZED (none).
  const markers = [assessment.meta.participant, assessment.claims, assessment.partiesAdded];
  const present = markers.filter((marker) => marker !== undefined).length;
  if (present !== 0 && present !== markers.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message:
        'An assessment is a partial (participant, claims, and partiesAdded together) or a finalized (none of them).',
    });
  }

  // Every answered value names a question and a rung the embedded workbook
  // authors: one lookup serves the standing answers and the ledger.
  const rungIds = new Map<string, Set<string>>();
  assessment.workbook.objectives.forEach((o) =>
    o.questions.forEach((q) => rungIds.set(q.id, new Set(q.ladder.map((r) => r.id)))),
  );

  assessment.answers.forEach((a, i) => {
    const rungs = rungIds.get(a.questionId);
    if (!rungs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers', i, 'questionId'],
        message: `Answer ${i} names unknown question "${a.questionId}".`,
      });
      return;
    }
    if (a.state === 'answered' && !rungs.has(a.rungId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers', i, 'rungId'],
        message: `Answer ${i} on ${a.questionId} names unknown rung "${a.rungId}".`,
      });
    }
  });

  assessment.ledger.forEach((landing, li) =>
    landing.records.forEach((record, ri) => {
      if (record.kind === 'party') return;
      const qid = record.questionId;
      const rungs = rungIds.get(qid);
      if (!rungs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ledger', li, 'records', ri, 'questionId'],
          message: `Landing ${li} record ${ri} names unknown question "${qid}".`,
        });
        return;
      }
      const named: string[] = [];
      [record.before, record.after, ...record.candidates.map((c) => c.answer)].forEach((value) => {
        if (value && value.state === 'answered') named.push(value.rungId);
      });
      if (record.decision.kind === 'resolved' && record.decision.choice.kind === 'reanswer') {
        named.push(record.decision.choice.rungId);
      }
      named
        .filter((rungId) => !rungs.has(rungId))
        .forEach((rungId) =>
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ledger', li, 'records', ri],
            message: `Landing ${li} record ${ri} names unknown rung "${rungId}" on ${qid}.`,
          }),
        );
    }),
  );

  const roleIds = new Set(assessment.workbook.roles.map((r) => r.id));
  const dimIds = new Set(assessment.workbook.dimensions.map((d) => d.id));
  const partyIds = new Set(
    [...assessment.parties, ...(assessment.partiesAdded ?? [])].map((p) => p.id),
  );
  (assessment.claims ?? []).forEach((claim, i) => {
    claim.roles.forEach((role, ri) => {
      if (!roleIds.has(role)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['claims', i, 'roles', ri],
          message: `Claim names unknown role "${role}".`,
        });
      }
    });
    claim.dimensions.forEach((dim, di) => {
      if (!dimIds.has(dim)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['claims', i, 'dimensions', di],
          message: `Claim names unknown dimension "${dim}".`,
        });
      }
    });
    claim.parties.forEach((party, pi) => {
      if (!partyIds.has(party)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['claims', i, 'parties', pi],
          message: `Claim names unknown party "${party}".`,
        });
      }
    });
  });

  refineEstateParties(ctx, assessment.parties, assessment.workbook.parties);

  const partyTypeIds = new Set(assessment.workbook.parties.map((p) => p.id));
  const assessedTypes = assessedTypeIds(assessment.workbook.parties);
  (assessment.partiesAdded ?? []).forEach((party, i) => {
    if (!partyTypeIds.has(party.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partiesAdded', i, 'type'],
        message: `Added party ${party.id} has unknown party type "${party.type}".`,
      });
    }
    if (assessedTypes.has(party.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['partiesAdded', i, 'type'],
        message: `Added party ${party.id} may not be the assessed party; add only third parties.`,
      });
    }
    party.serves.forEach((dim, di) => {
      if (!dimIds.has(dim)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partiesAdded', i, 'serves', di],
          message: `Added party ${party.id} serves unknown dimension "${dim}".`,
        });
      }
    });
  });
});

export type AssessmentMeta = z.infer<typeof AssessmentMetaSchema>;
export type Assessment = z.infer<typeof AssessmentFieldsSchema>;

import { z } from 'zod';
import type { Party, PartyType } from './primitives';

// The concrete-party rules an estate-bearing record must satisfy (parties.md
// invariant #4): every party's `type` resolves against the owning workbook's
// party types, and exactly one party is the assessed "us". Shared verbatim by
// AssessmentSchema and WorkbookAssessmentSchema — the same estate, one rule.

export function assessedTypeIds(types: PartyType[]): Set<string> {
  return new Set(types.filter((t) => t.kind === 'assessed').map((t) => t.id));
}

export function refineEstateParties(
  ctx: z.RefinementCtx,
  parties: Party[],
  types: PartyType[],
): void {
  const typeIds = new Set(types.map((t) => t.id));
  parties.forEach((party, i) => {
    if (!typeIds.has(party.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parties', i, 'type'],
        message: `Party ${party.id} has unknown party type "${party.type}".`,
      });
    }
  });
  const assessed = assessedTypeIds(types);
  const declared = parties.filter((p) => assessed.has(p.type)).length;
  if (declared !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parties'],
      message: `Exactly one party must be the assessed party; found ${declared}.`,
    });
  }
}

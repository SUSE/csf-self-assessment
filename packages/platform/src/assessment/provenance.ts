import type { Answer, Assessment, Claim, Landing, Participant, Party, Workbook } from '../schema';

// partial: one participant's file (claim log + parties they added, never a ledger).
// finalized: the facilitator's assembled record, or an Author-QA reading. Every
// assessment carries workshop lineage — there is no lineage-free kind.
export type AssessmentProvenance =
  | { kind: 'partial'; workbookAssessment: string; participant: Participant; claims: Claim[]; partiesAdded: Party[] }
  | { kind: 'finalized'; workbookAssessment: string; ledger: Landing[] };

// Result of the version-match guard.
export type IntegrityResult =
  | { ok: true }
  | { ok: false; declared: { id: string; version: string }; embedded: { id: string; version: string } };

// The finalized reading the Author app scores for instrument-QA. The
// lineage id is synthetic and in-memory only — fed straight to evaluate(), never
// persisted or round-tripped through AssessmentSchema.
export const AUTHOR_QA_PROVENANCE: AssessmentProvenance = {
  kind: 'finalized',
  workbookAssessment: 'author-qa',
  ledger: [],
};

// The meta keys workbookAssessment/participant are written only when asserted.
export function assessmentOf(
  workbook: Workbook,
  estate: string,
  parties: Party[],
  answers: Answer[],
  provenance: AssessmentProvenance,
): Assessment {
  const meta = {
    workbookId: workbook.meta.id,
    workbookVersion: workbook.meta.version,
    estate,
  };
  switch (provenance.kind) {
    case 'partial':
      return {
        meta: { ...meta, workbookAssessment: provenance.workbookAssessment, participant: provenance.participant },
        workbook,
        parties,
        claims: provenance.claims,
        partiesAdded: provenance.partiesAdded,
        ledger: [],
        answers,
      };
    case 'finalized':
      return {
        meta: { ...meta, workbookAssessment: provenance.workbookAssessment },
        workbook,
        parties,
        ledger: provenance.ledger,
        answers,
      };
  }
}

// The graceful-default seed: the assessed party plus a first
// third-party provider serving every dimension. An institution-only workbook
// yields just the assessed party.
export function defaultParties(workbook: Workbook): Party[] {
  const assessed = workbook.parties.find((p) => p.kind === 'assessed');
  const provider = workbook.parties.find((p) => p.kind === 'third-party');
  const parties: Party[] = [];
  if (assessed) parties.push({ id: 'institution', name: 'Our institution', type: assessed.id, serves: [] });
  if (provider)
    parties.push({
      id: 'primary-provider',
      name: 'Primary provider',
      type: provider.id,
      serves: workbook.dimensions.map((d) => d.id),
    });
  return parties;
}

// The added-provider id algorithm: `<participant>:party-<n>`,
// one past the highest un-taken n. Shared so both add doorways mint identical ids.
export function nextAddedPartyId(existing: Party[], participantName: string): string {
  const taken = new Set(existing.map((p) => p.id));
  let n = 1;
  while (taken.has(`${participantName}:party-${n}`)) n += 1;
  return `${participantName}:party-${n}`;
}

// A name-only third party for partiesAdded, taking the workbook's first
// third-party type and serving nothing (the engine reads kind, never the type id).
// null when the name is blank or no third-party type exists, so the caller never
// appends a malformed party.
export function addedProviderFrom(
  workbook: Workbook,
  existing: Party[],
  participantName: string,
  name: string,
): Party | null {
  const trimmed = name.trim();
  const thirdParty = workbook.parties.find((p) => p.kind === 'third-party');
  if (trimmed === '' || thirdParty === undefined) return null;
  return { id: nextAddedPartyId(existing, participantName), name: trimmed, type: thirdParty.id, serves: [] };
}

// A self-contained assessment's declared identity must equal its embedded
// workbook's identity. A mismatch is refused (no migrations).
export function checkAssessmentIntegrity(assessment: Assessment): IntegrityResult {
  const declared = { id: assessment.meta.workbookId, version: assessment.meta.workbookVersion };
  const embedded = { id: assessment.workbook.meta.id, version: assessment.workbook.meta.version };
  if (declared.id !== embedded.id || declared.version !== embedded.version) {
    return { ok: false, declared, embedded };
  }
  return { ok: true };
}

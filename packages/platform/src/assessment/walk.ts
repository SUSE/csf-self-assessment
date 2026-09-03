import type { Answer, Claim, DimensionQuestion, Party, Question, Target, Workbook } from '../schema';
import { applicableDimensionsOf } from './placement';

// The active claim filters the walk; the claim LOG accumulates claims, the walk shows
// one (delivery §2.3).
export type WalkSection = {
  objectiveId: string;
  objectiveName: string;
  questions: Question[];
};

function sectionsOf(workbook: Workbook, keep: (q: Question) => boolean): WalkSection[] {
  return workbook.objectives.flatMap((o) => {
    const questions = o.questions.filter(keep);
    return questions.length === 0 ? [] : [{ objectiveId: o.id, objectiveName: o.name, questions }];
  });
}

// Does a claim show this question in the walk? The role must match; an empty subject
// (no dimensions AND no parties) covers everything for those roles; else a dimension
// question is covered iff its appliesTo meets the claim's dimensions, and a
// party-axis question iff any existing party is claimed. Assessment-axis: empty
// subject only.
export function claimCoversQuestion(parties: Party[], claim: Claim, question: Question): boolean {
  if (!claim.roles.includes(question.role)) return false;
  if (claim.dimensions.length === 0 && claim.parties.length === 0) return true;
  if (question.grain === 'dimension') {
    const dims = new Set(claim.dimensions);
    return question.appliesTo.some((d) => dims.has(d));
  }
  if (question.axis === 'party') {
    const partySet = new Set(claim.parties);
    return parties.some((p) => partySet.has(p.id));
  }
  return false;
}

// The unit-grain twin of claimCoversQuestion. Party ids are direct (a reconciled id
// is remapped at merge by rewriteClaimParties).
export function claimCoversUnit(claim: Claim, question: Question, target: Target): boolean {
  if (!claim.roles.includes(question.role)) return false;
  if (claim.dimensions.length === 0 && claim.parties.length === 0) return true;
  const dims = new Set(claim.dimensions);
  const partySet = new Set(claim.parties);
  switch (target.kind) {
    case 'dimension':
    case 'dimension-stratum':
      return dims.has(target.dimension);
    case 'party':
      return partySet.has(target.party);
    case 'assessment':
      return false;
  }
}

// The dimension ids a question exposes under a claim (delivery §2.3.3): all of
// appliesTo under a whole subject, else only the appliesTo dimensions it names.
export function claimVisibleDimensions(claim: Claim, question: DimensionQuestion): string[] {
  if (claim.dimensions.length === 0 && claim.parties.length === 0) return applicableDimensionsOf(question);
  const dims = new Set(claim.dimensions);
  return applicableDimensionsOf(question).filter((d) => dims.has(d));
}

// The party-axis twin: every party under a whole subject, else only the claimed
// parties — so a party question's chips equal the claimed-completeness denominator.
export function claimVisibleParties(parties: Party[], claim: Claim): Party[] {
  if (claim.dimensions.length === 0 && claim.parties.length === 0) return parties;
  const partySet = new Set(claim.parties);
  return parties.filter((p) => partySet.has(p.id));
}

// A provider is claimed iff some claim names it (delivery §2.6.5, invariant #3). The
// Parties page blocks removing a claimed provider — the claim log must never lie.
export function partyClaimed(claims: Claim[], partyId: string): boolean {
  return claims.some((claim) => claim.parties.includes(partyId));
}

// The answer half of the removal guard (spec §4.9): a provider has an answer iff some
// party-target answer names it, any state.
export function partyAnswered(answers: Answer[], partyId: string): boolean {
  return answers.some((a) => a.target.kind === 'party' && a.target.party === partyId);
}

// The active claim's filtered walk: objective-grouped questions in workbook order,
// each dimension question narrowed to the dimensions the claim exposes (§2.3.3).
export function claimWalk(workbook: Workbook, parties: Party[], claim: Claim): WalkSection[] {
  return sectionsOf(workbook, (q) => claimCoversQuestion(parties, claim, q)).map((section) => ({
    ...section,
    questions: section.questions.map((q) =>
      q.grain === 'dimension' ? { ...q, appliesTo: claimVisibleDimensions(claim, q) } : q,
    ),
  }));
}

// The Author-preview / finalized walk (every question, objective-grouped).
export function fullWalk(workbook: Workbook): WalkSection[] {
  return sectionsOf(workbook, () => true);
}

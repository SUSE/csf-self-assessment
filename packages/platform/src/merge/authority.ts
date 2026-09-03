import type { Answer, Authority, Claim, Question, Target, Workbook } from '../schema';
import { claimCoversUnit, questionOf } from '../assessment';

// The authority ladder (merge.md §2.3): what standing a participant had on the
// unit they answered, read off the claims they made. Pure — no clock, no ids.

/** Where a candidate's standing comes from: the covering claim of highest
 *  authority (earliest wins within a tier — the participant's claims are
 *  ordered), and the rung it confers. */
export type CandidateProvenance = { claim: Claim | null; authority: Authority };

const isBlanket = (claim: Claim): boolean => claim.dimensions.length === 0 && claim.parties.length === 0;

/** A participant's standing on one answer unit (merge.md §2.3): `owner` when a
 *  claim of theirs NAMES this dimension or party, `blanket` when a claim covers
 *  the question's role with an empty subject, else `out-of-claim`. A flag, never
 *  a refusal (§2.3.4). */
export function authorityOf(claims: Claim[], question: Question, target: Target): Authority {
  return conferring(claims, question, target)?.authority ?? 'out-of-claim';
}

/** The claim to record against an answer and the authority it confers — the
 *  claim that PRODUCED it (invariant #5), so a finalized file explains the
 *  candidate without the participant's claim log. An answer on a question the
 *  workbook does not carry has no provenance: `{ claim: null, authority:
 *  'out-of-claim' }`. */
export function candidateProvenance(
  workbook: Workbook,
  claims: Claim[],
  answer: Answer,
): CandidateProvenance {
  const question = questionOf(workbook, answer.questionId);
  if (question === undefined) return { claim: null, authority: 'out-of-claim' };
  return conferring(claims, question, answer.target) ?? { claim: null, authority: 'out-of-claim' };
}

/** The badge text for a rung. Presentation vocabulary, owned here so no
 *  component invents it. */
export function authorityLabel(authority: Authority): string {
  switch (authority) {
    case 'owner':
      return 'claim owner';
    case 'blanket':
      return 'blanket claim';
    case 'out-of-claim':
      return 'outside their claims';
  }
}

function conferring(claims: Claim[], question: Question, target: Target): CandidateProvenance | null {
  const covering = claims.filter((claim) => claimCoversUnit(claim, question, target));
  const owner = covering.find((claim) => !isBlanket(claim));
  if (owner !== undefined) return { claim: owner, authority: 'owner' };
  const blanket = covering.find(isBlanket);
  if (blanket !== undefined) return { claim: blanket, authority: 'blanket' };
  return null;
}

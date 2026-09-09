import { describe, expect, it } from 'vitest';
import type { Answer, Claim, Party, Workbook } from '../schema';
import { answerFor, assessmentOf, claimCompleteness, estateCoverage, scopeCompleteness } from './index';
import { CLAIM_WB, G, INST, P3, PARTY_WB, STRAT_WB } from './fixtures';

const ANSWERED = { state: 'answered', rungId: 'choice-2' } as const;
const parties = [INST];

const claim = (roles: string[], dimensions: string[] = [], partyIds: string[] = []) => ({
  roles,
  dimensions,
  parties: partyIds,
});

const partialOf = (
  workbook: Workbook,
  roster: Party[],
  answers: Answer[],
  claims: Claim[],
  name = 'A',
) =>
  assessmentOf(workbook, 'E', roster, answers, {
    kind: 'partial',
    workbookAssessment: 'wa-1',
    participant: { name },
    claims,
    partiesAdded: [],
  });

describe('completeness over whole dimensions (delivery-S6)', () => {
  const q2compute = answerFor('q2', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G);

  it('claimCompleteness counts recorded units over the units the claim covers', () => {
    expect(claimCompleteness(CLAIM_WB, parties, [q2compute], claim(['ARCH'], ['compute']))).toEqual({
      answered: 1,
      total: 1,
    });
    expect(claimCompleteness(CLAIM_WB, parties, [q2compute], claim(['ARCH']))).toEqual({ answered: 1, total: 2 });
  });

  it('scopeCompleteness unions the claims, counting each unit once', () => {
    const claims = [claim(['ARCH'], ['compute']), claim(['SEC'], ['network'])];
    expect(scopeCompleteness(CLAIM_WB, parties, [q2compute], claims)).toEqual({ answered: 1, total: 2 });
  });

  it('estateCoverage splits base units into covered / claimed-incomplete / unclaimed', () => {
    const partial = partialOf(CLAIM_WB, parties, [q2compute], [claim(['ARCH'])]);
    expect(estateCoverage(CLAIM_WB, parties, [partial])).toEqual({
      covered: 1,
      claimedIncomplete: 1,
      unclaimed: 2,
      total: 4,
    });
  });
});

describe('completeness expands split dimensions', () => {
  // STRAT_WB splits compute into [software, chips]; network is unsplittable, and
  // SOV-6.d1 is a dimension question over both.
  const stratum = (name: string) =>
    answerFor('SOV-6.d1', { kind: 'dimension-stratum', dimension: 'compute', stratum: name }, ANSWERED, G);
  const computeWhole = answerFor('SOV-6.d1', { kind: 'dimension', dimension: 'compute' }, ANSWERED, G);
  const networkWhole = answerFor('SOV-6.d1', { kind: 'dimension', dimension: 'network' }, ANSWERED, G);
  const computeClaim = claim(['ARCH'], ['compute']);
  const bothStrata = [stratum('software'), stratum('chips')];

  it('claimCompleteness counts per-stratum units when the dimension is split', () => {
    expect(claimCompleteness(STRAT_WB, parties, bothStrata, computeClaim)).toEqual({ answered: 2, total: 2 });
    // One stratum answered leaves its sibling in the denominator; the whole-dimension
    // target is never probed.
    expect(claimCompleteness(STRAT_WB, parties, [stratum('software')], computeClaim)).toEqual({
      answered: 1,
      total: 2,
    });
  });

  it('claimCompleteness leaves an unsplit dimension at whole grain', () => {
    const networkClaim = claim(['ARCH'], ['network']);
    expect(claimCompleteness(STRAT_WB, parties, [networkWhole], networkClaim)).toEqual({ answered: 1, total: 1 });
    expect(claimCompleteness(STRAT_WB, parties, [], networkClaim)).toEqual({ answered: 0, total: 1 });
  });

  it('scopeCompleteness unions overlapping claims over the expanded stratum units once', () => {
    const claims = [computeClaim, claim(['ARCH'], ['compute', 'network'])];
    expect(scopeCompleteness(STRAT_WB, parties, bothStrata, claims)).toEqual({ answered: 2, total: 3 });
  });

  it('estateCoverage reads split-answered strata as covered, not claimed-incomplete', () => {
    const partial = partialOf(STRAT_WB, parties, bothStrata, [computeClaim]);
    expect(estateCoverage(STRAT_WB, parties, [partial])).toEqual({
      covered: 2,
      claimedIncomplete: 0,
      unclaimed: 1,
      total: 3,
    });
  });

  it('estateCoverage bridges cross-partial mixed grain via the parent-dimension fallback (D3)', () => {
    const whole = partialOf(STRAT_WB, parties, [computeWhole], [computeClaim], 'A');
    const split = partialOf(STRAT_WB, parties, [stratum('software')], [computeClaim], 'B');
    // B's stratum answer expands compute to [software, chips]: software is covered by B
    // directly, chips by A's whole-compute answer through the fallback.
    expect(estateCoverage(STRAT_WB, parties, [whole, split])).toEqual({
      covered: 2,
      claimedIncomplete: 0,
      unclaimed: 1,
      total: 3,
    });
  });
});

describe('completeness over the party axis (delivery-S7)', () => {
  it('claimCompleteness counts party units in the denominator', () => {
    const qpAws = answerFor('qp', { kind: 'party', party: 'aws' }, { state: 'answered', rungId: 'choice-3' }, G);
    expect(claimCompleteness(PARTY_WB, P3, [qpAws], claim(['SEC'], [], ['aws']))).toEqual({ answered: 1, total: 1 });
    expect(claimCompleteness(PARTY_WB, P3, [qpAws], claim(['SEC'], [], ['aws', 'alice:okta']))).toEqual({
      answered: 1,
      total: 2,
    });
  });
});

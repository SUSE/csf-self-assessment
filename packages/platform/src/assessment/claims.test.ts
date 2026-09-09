import { describe, expect, it } from 'vitest';
import {
  answerFor,
  claimCoversQuestion,
  claimCoversUnit,
  claimVisibleDimensions,
  claimVisibleParties,
  claimWalk,
  fullWalk,
  partyAnswered,
  partyClaimed,
} from './index';
import { AWS, CLAIM_WB, G, INST, OKTA, P3, PARTY_WB } from './fixtures';

const [q1, q2, q3] = CLAIM_WB.objectives[0].questions;
const [qd, qp] = PARTY_WB.objectives[0].questions;
const parties = [INST];
if (q2.grain !== 'dimension' || qd.grain !== 'dimension') throw new Error('q2 and qd must be dimension questions');

const claim = (roles: string[], dimensions: string[] = [], partyIds: string[] = []) => ({
  roles,
  dimensions,
  parties: partyIds,
});

const walkIds = (...args: Parameters<typeof claimWalk>) =>
  claimWalk(...args).flatMap((section) => section.questions.map((q) => q.id));

describe('partyClaimed', () => {
  it('is true when a claim names the party on its party axis', () => {
    expect(partyClaimed([claim(['SEC'], [], ['aws'])], 'aws')).toBe(true);
  });

  it('is false when no claim names the party', () => {
    expect(partyClaimed([claim(['SEC'], [], ['aws'])], 'okta')).toBe(false);
  });

  it('is false for an empty claim log', () => {
    expect(partyClaimed([], 'aws')).toBe(false);
  });

  it('is false for a dimension-only claim (names no party)', () => {
    expect(partyClaimed([claim(['SEC'], ['compute'])], 'aws')).toBe(false);
  });

  it('finds the party in a later claim', () => {
    expect(partyClaimed([claim(['SEC']), claim(['SEC'], [], ['aws'])], 'aws')).toBe(true);
  });
});

describe('partyAnswered', () => {
  const GROUP = { groupId: 'g1', placement: 'group' as const };
  const onParty = (state: { state: 'answered'; rungId: string } | { state: 'na' }) => [
    answerFor('SOV-2.q1', { kind: 'party', party: 'hyper' }, state, GROUP),
  ];

  it('is true for an answered party target', () => {
    expect(partyAnswered(onParty({ state: 'answered', rungId: 'choice-2' }), 'hyper')).toBe(true);
  });

  it('is true for a dont-know / n/a party target too (any state)', () => {
    expect(partyAnswered(onParty({ state: 'na' }), 'hyper')).toBe(true);
  });

  it('is false when no answer names it', () => {
    expect(partyAnswered(onParty({ state: 'answered', rungId: 'choice-2' }), 'institution')).toBe(false);
  });

  it('is false for a non-party (dimension) target of the same id string', () => {
    const onDimension = [answerFor('SOV-6.d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G)];
    expect(partyAnswered(onDimension, 'compute')).toBe(false);
  });
});

describe('claim scope over the dimension axis (delivery-S6)', () => {
  it('claimCoversQuestion matches on any gate role, then on dimension overlap', () => {
    expect(claimCoversQuestion(parties, claim(['ARCH'], ['compute']), q2)).toBe(true);
    expect(claimCoversQuestion(parties, claim(['ARCH', 'SEC'], ['network']), q3)).toBe(true);
    expect(claimCoversQuestion(parties, claim(['OPS']), q2)).toBe(false);
    expect(claimCoversQuestion(parties, claim(['ARCH'], ['network']), q2)).toBe(false);
  });

  it('claimCoversUnit gates dimension units by the claim and assessment units by empty dimensions', () => {
    expect(claimCoversUnit(claim(['ARCH'], ['compute']), q2, { kind: 'dimension', dimension: 'compute' })).toBe(true);
    expect(claimCoversUnit(claim(['ARCH'], ['compute']), q2, { kind: 'dimension', dimension: 'storage' })).toBe(false);
    expect(claimCoversUnit(claim(['LEG']), q1, { kind: 'assessment' })).toBe(true);
    expect(claimCoversUnit(claim(['LEG'], ['compute']), q1, { kind: 'assessment' })).toBe(false);
  });

  it('claimVisibleDimensions narrows a dimension question’s appliesTo to the claimed dimensions', () => {
    expect(claimVisibleDimensions(claim(['ARCH'], ['compute']), q2)).toEqual(['compute']);
    expect(claimVisibleDimensions(claim(['ARCH']), q2)).toEqual(['compute', 'storage']);
  });

  it('claimWalk narrows the walk to claimed units — the "no Storage" proof', () => {
    const arch = claimWalk(CLAIM_WB, parties, claim(['ARCH'], ['compute']));
    expect(arch).toHaveLength(1);
    expect(arch[0].objectiveId).toBe('O1');
    expect(arch[0].questions.map((q) => q.id)).toEqual(['q2']);
    const [only] = arch[0].questions;
    expect(only.grain === 'dimension' && only.appliesTo).toEqual(['compute']);
    expect(walkIds(CLAIM_WB, parties, claim(['ARCH', 'SEC'], ['compute']))).toEqual(['q2']);
  });

  it('fullWalk shows every question in workbook order, one section', () => {
    const sections = fullWalk(CLAIM_WB);
    expect(sections).toHaveLength(1);
    expect(sections[0].objectiveId).toBe('O1');
    expect(sections[0].questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });
});

describe('claim scope over the party axis (delivery-S7)', () => {
  it('claimCoversQuestion on the party axis is direct — no transitive dimension rule', () => {
    expect(claimCoversQuestion(P3, claim(['SEC'], [], ['aws']), qp)).toBe(true);
    expect(claimCoversQuestion(P3, claim(['SEC'], ['compute']), qp)).toBe(false);
    expect(claimCoversQuestion(P3, claim(['SEC']), qp)).toBe(true);
    expect(claimCoversQuestion(P3, claim(['ARCH'], [], ['aws']), qp)).toBe(false);
  });

  it('claimCoversUnit gates a party unit by claim.parties', () => {
    expect(claimCoversUnit(claim(['SEC'], [], ['aws']), qp, { kind: 'party', party: 'aws' })).toBe(true);
    expect(claimCoversUnit(claim(['SEC'], [], ['aws']), qp, { kind: 'party', party: 'alice:okta' })).toBe(false);
    expect(claimCoversUnit(claim(['SEC']), qp, { kind: 'party', party: 'alice:okta' })).toBe(true);
    expect(claimCoversUnit(claim(['SEC'], ['compute']), qp, { kind: 'party', party: 'aws' })).toBe(false);
  });

  it('the subject is the union dimensions ∪ parties at unit grain', () => {
    const both = claim(['SEC'], ['compute'], ['aws']);
    expect(claimCoversUnit(both, qd, { kind: 'dimension', dimension: 'compute' })).toBe(true);
    expect(claimCoversUnit(both, qp, { kind: 'party', party: 'aws' })).toBe(true);
  });

  it('claimVisibleParties exposes the claimed providers, or all under a whole subject', () => {
    expect(claimVisibleParties(P3, claim(['SEC'], [], ['aws']))).toEqual([AWS]);
    expect(claimVisibleParties(P3, claim(['SEC']))).toEqual([INST, AWS, OKTA]);
    expect(claimVisibleParties(P3, claim(['SEC'], ['compute']))).toEqual([]);
  });

  it('claimVisibleDimensions is [] for a parties-only subject', () => {
    expect(claimVisibleDimensions(claim(['SEC'], [], ['aws']), qd)).toEqual([]);
  });

  it('claimWalk includes the party question for a providers-only claim, the union for both axes', () => {
    expect(walkIds(PARTY_WB, P3, claim(['SEC'], [], ['aws']))).toEqual(['qp']);
    expect(walkIds(PARTY_WB, P3, claim(['SEC'], ['compute'], ['aws']))).toEqual(['qd', 'qp']);
  });
});

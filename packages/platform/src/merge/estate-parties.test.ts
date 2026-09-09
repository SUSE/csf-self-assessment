import { describe, expect, it } from 'vitest';
import type { PartyDecision } from '../schema';
import { isClash } from './clash-types';
import { canLand, reviewLanding, reviewSummary } from './review';
import { land } from './land';
import { ledgerUnits, recordSentence } from './ledger';
import { suggestPartyPairs } from './parties';
import { ALEX, JANE, JANE_STAMP, WA, emptyBase, landAlex, takeJane } from './estate-fixture';

const ALIAS_ABSORB: PartyDecision = {
  added: 'acme-eu',
  choice: { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud EU' },
  note: '',
};
const COLLISION_ABSORB: PartyDecision = {
  added: 'modelhouse',
  choice: { kind: 'absorb', into: 'modelhouse', name: 'Modelhouse AI GmbH' },
  note: '',
};

describe('the party axis of the Alex/Jane pair', () => {
  it('the reviewed landing leaves both additions standing', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    expect(review.decided).toEqual([]);
    expect(review.additions.map((p) => p.id)).toEqual(['acme-eu', 'northstar-edge']);
  });

  it('Alex against the seeded roster proposes no pair', () => {
    expect(suggestPartyPairs(emptyBase(), ALEX)).toEqual([]);
  });

  it('Jane proposes the modelhouse collision then the acme alias', () => {
    const alex = landAlex();
    const pairs = suggestPartyPairs(alex.base, JANE);
    expect(pairs).toHaveLength(2);
    const [collision, alias] = pairs;
    if (collision.kind !== 'id-collision') throw new Error('expected the collision first');
    expect(collision.id).toBe('modelhouse');
    expect(collision.splitId).toBe('modelhouse-jane');
    expect(collision.serves).toEqual({
      shared: ['aiml'],
      baseOnly: [],
      incomingOnly: ['software-supply'],
    });
    if (alias.kind !== 'alias') throw new Error('expected the alias second');
    expect(alias.base.id).toBe('acme-cloud');
    expect(alias.incoming.id).toBe('acme-eu');
    expect(alias.sharedTokens).toEqual(['acme', 'cloud']);
    expect(alias.score).toBe(10);
    expect(alias.splitId).toBe('acme-eu');
    expect(alias.serves).toEqual({
      shared: ['compute', 'storage', 'network', 'iam', 'platform', 'security'],
      baseOnly: ['edge', 'facilities'],
      incomingOnly: [],
    });
  });

  it('absorbing the alias manufactures clashes', () => {
    const alex = landAlex();
    const decided = reviewLanding(alex.base, alex.ledger, JANE, [ALIAS_ABSORB, COLLISION_ABSORB]);
    expect(reviewSummary(decided, [])).toEqual({
      answers: 61,
      newUnits: 3,
      clashes: 35,
      decided: 0,
      collisions: 0,
    });
    expect(decided.units).toHaveLength(58);
    expect(decided.units.filter((u) => u.kind === 'agreed')).toHaveLength(20);
    expect(decided.units.filter((u) => u.kind === 'sole-source')).toHaveLength(3);
    expect(decided.units.filter((u) => u.kind === 'unit-clash')).toHaveLength(34);
    expect(decided.units.filter((u) => u.kind === 'grain-clash')).toHaveLength(1);
    const clashes = decided.units.filter(isClash);
    expect(clashes.filter((c) => c.clash === 'divergence')).toHaveLength(27);
    expect(clashes.filter((c) => c.clash === 'gap')).toHaveLength(5);
    expect(clashes.filter((c) => c.clash === 'scope')).toHaveLength(2);
    expect(clashes.filter((c) => c.clash === 'grain')).toHaveLength(1);
  });

  it('Land is gated on the collision, not only on the clashes', () => {
    const alex = landAlex();
    const open = reviewLanding(alex.base, alex.ledger, JANE, []);
    const resolutions = takeJane(open.units.filter(isClash));
    expect(resolutions).toHaveLength(30);
    expect(canLand(reviewSummary(open, resolutions))).toBe(false);

    const settled = reviewLanding(alex.base, alex.ledger, JANE, [COLLISION_ABSORB]);
    expect(reviewSummary(settled, resolutions).collisions).toBe(0);
  });

  it('the decided roster keeps the estate’s ids and Jane’s chosen name', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, [ALIAS_ABSORB, COLLISION_ABSORB]);
    expect(review.parties.map((p) => p.id)).toEqual([
      'inst',
      'acme-cloud',
      'modelhouse',
      'siliconware',
      'northstar-edge',
    ]);
    const modelhouse = review.parties.find((p) => p.id === 'modelhouse');
    expect(modelhouse?.name).toBe('Modelhouse AI GmbH');
    expect(modelhouse?.serves).toEqual(['aiml', 'software-supply']);
    const acme = review.parties.find((p) => p.id === 'acme-cloud');
    expect(acme?.name).toBe('Acme Cloud EU');
    expect(acme?.serves).toHaveLength(8);
    expect(review.additions.map((p) => p.id)).toEqual(['northstar-edge']);
  });

  it('landing both with the party axis decided writes 88 units', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, [ALIAS_ABSORB, COLLISION_ABSORB]);
    const outcome = land(
      alex.base,
      alex.ledger,
      JANE,
      { resolutions: takeJane(review.units.filter(isClash)), partyDecisions: [ALIAS_ABSORB, COLLISION_ABSORB] },
      JANE_STAMP,
    );
    if (!outcome.ok) throw new Error('the decided landing should commit');
    const records = outcome.ledger[1].records;
    expect(
      records.filter((r) => r.kind === 'party').map((r) => (r.kind === 'party' ? r.decision.kind : null)),
    ).toEqual(['absorb', 'rename', 'add']);
    expect(ledgerUnits(outcome.ledger)).toHaveLength(88);
    expect(outcome.base.answers).toHaveLength(87);
    expect([records[0], records[1]].map((record) => recordSentence(record, WA.workbook))).toEqual([
      'Acme Cloud Europe SAS and Acme Cloud EU are one provider — kept “Acme Cloud EU” as acme-cloud',
      'Modelhouse AI GmbH and Modelhouse AI are one provider — kept “Modelhouse AI GmbH” as modelhouse +software-supply',
    ]);
  });
});

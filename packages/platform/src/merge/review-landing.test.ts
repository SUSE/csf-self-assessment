import { describe, expect, it } from 'vitest';
import type { Assessment, EstateBase, Party, PartyChoice } from '../schema';
import { isClash } from './clash-types';
import { canLand, reviewLanding, reviewSummary } from './review';
import { INST, clashUnit, onParty, partial } from './synthetic-fixture';

const ACME_CLOUD: Party = { id: 'acme-cloud', name: 'Acme Cloud EU', type: 'subprocessor', serves: ['edge', 'facilities'] };
const ACME_EU_ADDED: Party = { id: 'acme-eu', name: 'Acme Cloud Europe SAS', type: 'subprocessor', serves: ['compute'] };
const ALIAS_BASE: EstateBase = { parties: [INST, ACME_CLOUD], answers: [] };

const MH: Party = { id: 'mh', name: 'Modelhouse AI', type: 'subprocessor', serves: ['aiml'] };
const MH_ADDED: Party = { id: 'mh', name: 'Modelhouse AI GmbH', type: 'subprocessor', serves: ['aiml', 'software-supply'] };
const COLLISION_BASE: EstateBase = { parties: [INST, MH], answers: [] };

// Jane answers one added provider and claims it.
const claiming = (added: Party): Assessment =>
  partial('Jane', [onParty(added.id)], [{ roles: ['SEC'], dimensions: [], parties: [added.id] }], [added]);

const aliasIncoming = () => claiming(ACME_EU_ADDED);
const collisionIncoming = () => claiming(MH_ADDED);

describe('reviewLanding — the party axis', () => {
  it('an absorb rewrites both axes and inherits the incoming’s edges', () => {
    const choice: PartyChoice = { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud Europe SAS' };
    const review = reviewLanding(ALIAS_BASE, [], aliasIncoming(), [{ added: 'acme-eu', choice, note: 'same SAS' }]);
    expect(review.parties.map((p) => p.id)).toEqual(['inst', 'acme-cloud']);
    expect(review.parties[1].name).toBe('Acme Cloud Europe SAS');
    expect(review.parties[1].serves).toEqual(['edge', 'facilities', 'compute']);
    expect(review.units[0].target).toEqual({ kind: 'party', party: 'acme-cloud' });
    expect(review.incoming.claims?.[0].parties).toEqual(['acme-cloud']);
    expect(review.incoming.partiesAdded?.map((p) => p.id)).toEqual([]);
    expect(review.additions).toEqual([]);
  });

  it('an absorb records both affected sets and the rewrites it caused', () => {
    const review = reviewLanding(ALIAS_BASE, [], aliasIncoming(), [
      { added: 'acme-eu', choice: { kind: 'absorb', into: 'acme-cloud', name: 'Acme Cloud EU' }, note: 'n' },
    ]);
    expect(review.decided).toHaveLength(1);
    const effect = review.decided[0];
    expect(effect.added).toBe('acme-eu');
    expect(effect.before.map((p) => p.id)).toEqual(['acme-cloud', 'acme-eu']);
    expect(effect.after.map((p) => p.id)).toEqual(['acme-cloud']);
    expect(effect.decision).toEqual({
      kind: 'absorb',
      from: 'acme-eu',
      into: 'acme-cloud',
      name: 'Acme Cloud EU',
      by: 'facilitator',
      note: 'n',
    });
    expect(effect.affectedTargets).toEqual([
      {
        questionId: 'SOV-1.pq',
        before: { kind: 'party', party: 'acme-eu' },
        after: { kind: 'party', party: 'acme-cloud' },
      },
    ]);
  });

  it('a same-id absorb is a rename with no target rewrite', () => {
    const review = reviewLanding(COLLISION_BASE, [], collisionIncoming(), [
      { added: 'mh', choice: { kind: 'absorb', into: 'mh', name: 'Modelhouse AI GmbH' }, note: '' },
    ]);
    const effect = review.decided[0];
    expect(effect.decision).toEqual({
      kind: 'rename',
      party: 'mh',
      name: 'Modelhouse AI GmbH',
      by: 'facilitator',
      note: '',
    });
    expect(effect.before.map((p) => p.id)).toEqual(['mh', 'mh']);
    expect(effect.affectedTargets).toEqual([]);
  });

  it('a split gives the addition its own id on both axes', () => {
    const choice: PartyChoice = { kind: 'split', id: 'mh-jane', from: 'mh' };
    const review = reviewLanding(COLLISION_BASE, [], collisionIncoming(), [{ added: 'mh', choice, note: '' }]);
    expect(review.parties.map((p) => p.id)).toEqual(['inst', 'mh', 'mh-jane']);
    expect(review.parties[1].name).toBe('Modelhouse AI');
    expect(review.parties[1].serves).toEqual(['aiml']);
    expect(review.parties[2].name).toBe('Modelhouse AI GmbH');
    expect(review.parties[2].serves).toEqual(['aiml', 'software-supply']);
    expect(review.units[0].target).toEqual({ kind: 'party', party: 'mh-jane' });
    expect(review.incoming.claims?.[0].parties).toEqual(['mh-jane']);
  });

  it('a split records the estate side it was weighed against', () => {
    const review = reviewLanding(COLLISION_BASE, [], collisionIncoming(), [
      { added: 'mh', choice: { kind: 'split', id: 'mh-jane', from: 'mh' }, note: '' },
    ]);
    const effect = review.decided[0];
    expect(effect.decision).toEqual({ kind: 'split', from: 'mh', id: 'mh-jane', by: 'facilitator', note: '' });
    expect(effect.before.map((p) => p.id)).toEqual(['mh']);
    expect(effect.after.map((p) => p.id)).toEqual(['mh', 'mh-jane']);
    expect(effect.affectedTargets).toEqual([
      { questionId: 'SOV-1.pq', before: { kind: 'party', party: 'mh' }, after: { kind: 'party', party: 'mh-jane' } },
    ]);
  });

  it('an undecided id collision leaves the estate party untouched', () => {
    const review = reviewLanding(COLLISION_BASE, [], collisionIncoming(), []);
    expect(review.parties).toEqual([INST, MH]);
    expect(review.additions).toEqual([]);
    expect(review.pairs).toHaveLength(1);
    expect(review.pairs[0].kind).toBe('id-collision');
    expect(review.units[0].target).toEqual({ kind: 'party', party: 'mh' });
  });

  it('a decision naming a survivor that is not on the roster is not applied', () => {
    const review = reviewLanding(ALIAS_BASE, [], aliasIncoming(), [
      { added: 'acme-eu', choice: { kind: 'absorb', into: 'ghost', name: 'X' }, note: '' },
    ]);
    expect(review.decided).toEqual([]);
    expect(review.additions.map((p) => p.id)).toEqual(['acme-eu']);
  });
});

describe('canLand gates on collisions as well as clashes', () => {
  it('an undecided collision blocks the landing; deciding it clears the gate', () => {
    const undecided = reviewLanding(COLLISION_BASE, [], collisionIncoming(), []);
    const resolutions = undecided.units.filter(isClash).map((clash) => ({
      questionId: clash.questionId,
      target: clash.target,
      choice: { kind: 'take' as const, from: 'Jane' },
      note: '',
    }));
    const openSummary = reviewSummary(undecided, resolutions);
    expect(openSummary.collisions).toBe(1);
    expect(canLand(openSummary)).toBe(false);

    const settled = reviewLanding(COLLISION_BASE, [], collisionIncoming(), [
      { added: 'mh', choice: { kind: 'absorb', into: 'mh', name: 'Modelhouse AI GmbH' }, note: '' },
    ]);
    const settledSummary = reviewSummary(settled, resolutions);
    expect(settledSummary.collisions).toBe(0);
    expect(canLand(settledSummary)).toBe(true);
  });

  it('an undecided clash blocks it with no collision in play', () => {
    const review = reviewLanding(ALIAS_BASE, [], aliasIncoming(), []);
    const summary = reviewSummary({ ...review, units: [...review.units, clashUnit('gate')] }, []);
    expect(summary.collisions).toBe(0);
    expect(summary.clashes).toBe(1);
    expect(canLand(summary)).toBe(false);
  });
});

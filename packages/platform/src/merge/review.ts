import type {
  Assessment,
  ClashResolution,
  EstateBase,
  Landing,
  Party,
  PartyDecision,
  PartyRecordDecision,
  TargetRewrite,
} from '../schema';
import { absorb, suggestPartyPairs } from './parties';
import type { PartyPair } from './parties';
import { classify, isClash, unitKey } from './clash-types';
import type { LandingUnit } from './clash-types';
import { resolveClash } from './resolve';

// The whole landing under review: the party pass first, then
// every answer unit, then the gate. Pure — no clock, no ids minted.

const FACILITATOR = 'facilitator';

// What one party decision did to the estate roster — exactly the party record's
// body, minus the record's `kind`. `before` = [estate side, …incoming side].
export type PartyEffect = {
  // The incoming addition this decision settled.
  added: string;
  before: Party[];
  after: Party[];
  decision: PartyRecordDecision;
  affectedTargets: TargetRewrite[];
};

export type LandingReview = {
  // The estate roster after the applied party decisions and the additions.
  parties: Party[];
  // The incoming partial with party ids rewritten on its answer targets, its
  // claims and its `partiesAdded`.
  incoming: Assessment;
  // Additions that simply join: no applied decision and no id already on the
  // roster.
  additions: Party[];
  // Every pair this landing proposes, decided or not — a decided pair keeps its
  // card so a mind can still change before Land.
  pairs: PartyPair[];
  // The applied decisions, in decision order.
  decided: PartyEffect[];
  units: LandingUnit[];
};

// The whole landing under review: party decisions applied first, because
// collapsing a party rewrites answer targets and so manufactures clashes.
// - mints no records and reads no clock.
export function reviewLanding(
  base: EstateBase,
  ledger: readonly Landing[],
  incoming: Assessment,
  decisions: PartyDecision[],
): LandingReview {
  const added = incoming.partiesAdded ?? [];
  const roster = new Map(base.parties.map((p) => [p.id, { ...p, serves: [...p.serves] }]));

  // The answer targets a decision rewrites (§2.3.5) — none when the survivor
  // already carries the incoming id.
  const rewritesFor = (settled: string, survivor: string): TargetRewrite[] =>
    survivor === settled
      ? []
      : incoming.answers.flatMap((answer) =>
        answer.target.kind === 'party' && answer.target.party === settled
          ? [
            {
              questionId: answer.questionId,
              before: answer.target,
              after: { kind: 'party' as const, party: survivor },
            },
          ]
          : [],
      );

  const into = new Map<string, string>();
  const decided: PartyEffect[] = [];
  for (const decision of decisions) {
    const addition = added.find((p) => p.id === decision.added);
    if (addition === undefined) continue;
    const choice = decision.choice;
    if (choice.kind === 'absorb') {
      const survivor = roster.get(choice.into);
      if (survivor === undefined) continue;
      const absorption = absorb(survivor, addition, choice.name);
      roster.set(choice.into, absorption.party);
      into.set(decision.added, choice.into);
      const settlesSameId = choice.into === decision.added;
      const recordDecision: PartyRecordDecision = settlesSameId
        ? {
          kind: 'rename',
          party: choice.into,
          name: choice.name,
          by: FACILITATOR,
          note: decision.note,
        }
        : {
          kind: 'absorb',
          from: decision.added,
          into: choice.into,
          name: choice.name,
          by: FACILITATOR,
          note: decision.note,
        };
      decided.push({
        added: decision.added,
        before: [survivor, addition],
        after: [absorption.party],
        decision: recordDecision,
        affectedTargets: rewritesFor(decision.added, choice.into),
      });
    } else {
      if (roster.has(choice.id)) continue;
      const against = roster.get(choice.from);
      const split: Party = { ...addition, id: choice.id, serves: [...addition.serves] };
      roster.set(choice.id, split);
      into.set(decision.added, choice.id);
      decided.push({
        added: decision.added,
        before: against === undefined ? [] : [against],
        after: against === undefined ? [split] : [against, split],
        decision: {
          kind: 'split',
          from: choice.from,
          id: choice.id,
          by: FACILITATOR,
          note: decision.note,
        },
        affectedTargets: rewritesFor(decision.added, choice.id),
      });
    }
  }

  const additions: Party[] = [];
  for (const party of added) {
    if (into.has(party.id)) continue;
    if (roster.has(party.id)) continue;
    roster.set(party.id, { ...party, serves: [...party.serves] });
    additions.push(party);
  }

  const rewritten: Assessment = {
    ...incoming,
    answers: incoming.answers.map((answer) =>
      answer.target.kind === 'party' && into.has(answer.target.party)
        ? { ...answer, target: { kind: 'party', party: into.get(answer.target.party) ?? answer.target.party } }
        : answer,
    ),
    ...(incoming.claims === undefined
      ? {}
      : {
        claims: incoming.claims.map((claim) => ({
          ...claim,
          parties: claim.parties.map((party) => into.get(party) ?? party),
        })),
      }),
    ...(incoming.partiesAdded === undefined
      ? {}
      : { partiesAdded: incoming.partiesAdded.filter((p) => !into.has(p.id)) }),
  };

  const parties = [...roster.values()];
  return {
    parties,
    incoming: rewritten,
    additions,
    pairs: suggestPartyPairs(base, incoming),
    decided,
    units: classify({ parties, answers: base.answers }, ledger, rewritten),
  };
}

export type ReviewSummary = {
  // Incoming answers this landing carries — a grain clash counts every answer
  // its incoming side put in, so the header still reads the partial's size.
  answers: number;
  newUnits: number;
  clashes: number;
  decided: number;
  // Id collisions with no applied decision. Land is gated on this reaching zero
  // too: not deciding one is the silent first-wins overwrite
  // this slice removes. An undecided ALIAS pair never gates — keeping both is a
  // lossless default.
  collisions: number;
};

export function reviewSummary(
  review: LandingReview,
  resolutions: ClashResolution[],
): ReviewSummary {
  const byKey = new Map(resolutions.map((r) => [unitKey(r.questionId, r.target), r]));
  const units = review.units;
  const clashes = units.filter(isClash);
  const settled = new Set(review.decided.map((effect) => effect.added));
  return {
    answers: units.reduce((total, unit) => total + incomingAnswerCount(unit), 0),
    newUnits: units.filter((u) => u.kind === 'sole-source').length,
    clashes: clashes.length,
    decided: clashes.filter((clash) => resolveClash(clash, byKey.get(unitKey(clash.questionId, clash.target))) !== null)
      .length,
    collisions: review.pairs.filter((pair) => pair.kind === 'id-collision' && !settled.has(pair.id))
      .length,
  };
}

// Whether this landing may commit: every clash decided and every id collision
// decided. The only gate — everything else lands, flagged.
export function canLand(summary: ReviewSummary): boolean {
  return summary.decided === summary.clashes && summary.collisions === 0;
}

const incomingAnswerCount = (unit: LandingUnit): number =>
  unit.kind !== 'grain-clash' || unit.rollUpSide === 'incoming' ? 1 : unit.strata.length;

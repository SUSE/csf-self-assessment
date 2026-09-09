import type { Answer, Authority, ClashChoice, WorkbookAssessment } from '../schema';
import { choiceKey } from './choices';
import type { LandingClash, ReviewCandidate, UnitClash } from './clash-types';
import { describeTarget } from './index';

// What the merge core suggests on a clash: the ladder on a
// divergence, the class's own default otherwise. A suggestion is never a
// decision — `land` still counts an unclicked clash undecided.

// Why a choice is suggested. `authority` carries the ladder verdict (a
// winner's tier is never `out-of-claim` — that rung outranks nothing);
// `evidence` is the within-tier tiebreak; the last three are the class's own
// default.
export type SuggestionBasis =
  | { kind: 'authority'; tier: 'owner' | 'blanket'; winner: string; loser: string }
  | { kind: 'evidence'; winner: string }
  | { kind: 'knowledge'; knew: string; didNot: string }
  | { kind: 'scope'; excludedBy: string }
  | { kind: 'grain' };

// The pre-selected choice on a clash. `key` matches the `key` of the
// `ClashOption` it suggests, so a component compares keys and computes
// nothing.
export type Suggestion = { key: string; choice: ClashChoice; basis: SuggestionBasis };

const RUNG: Record<Authority, number> = { owner: 2, blanket: 1, 'out-of-claim': 0 };

const hasEvidence = (answer: Answer): boolean => answer.state === 'answered' && answer.evidence !== undefined;

const takeFrom = (candidate: ReviewCandidate, basis: SuggestionBasis): Suggestion => {
  const choice: ClashChoice = { kind: 'take', from: candidate.from };
  return { key: choiceKey(choice), choice, basis };
};

// The suggested choice, or null on a full tie (merge.md §2.3.1). Never
// applied — `land` still counts an unclicked clash undecided.
export function suggest(clash: LandingClash): Suggestion | null {
  if (clash.kind === 'grain-clash') {
    const choice: ClashChoice = { kind: 'grain', keep: 'strata' };
    return { key: choiceKey(choice), choice, basis: { kind: 'grain' } };
  }
  switch (clash.clash) {
    case 'gap': {
      const [knew, didNot] =
        clash.base.answer.state === 'dont-know' ? [clash.incoming, clash.base] : [clash.base, clash.incoming];
      return takeFrom(knew, { kind: 'knowledge', knew: knew.from, didNot: didNot.from });
    }
    case 'scope': {
      const excluded = clash.base.answer.state === 'na' ? clash.base : clash.incoming;
      return takeFrom(excluded, { kind: 'scope', excludedBy: excluded.from });
    }
    case 'divergence':
      return ladder(clash);
  }
}

function ladder(clash: UnitClash): Suggestion | null {
  const { base, incoming } = clash;
  if (RUNG[base.authority] !== RUNG[incoming.authority]) {
    const [winner, loser] = RUNG[base.authority] > RUNG[incoming.authority] ? [base, incoming] : [incoming, base];
    return winner.authority === 'out-of-claim'
      ? null
      : takeFrom(winner, {
        kind: 'authority',
        tier: winner.authority,
        winner: winner.from,
        loser: loser.from,
      });
  }
  const baseEvidence = hasEvidence(base.answer);
  const incomingEvidence = hasEvidence(incoming.answer);
  if (baseEvidence === incomingEvidence) return null;
  const winner = baseEvidence ? base : incoming;
  return takeFrom(winner, { kind: 'evidence', winner: winner.from });
}

// A suggestion rendered for the card: the option to pre-select and the
// reason that must be visible beside it ( — never a bare
// pre-selection). Null when there is no suggestion.
export type SuggestedChoice = { key: string; reason: string };

export function suggestedChoice(clash: LandingClash, wa: WorkbookAssessment): SuggestedChoice | null {
  const suggestion = suggest(clash);
  return suggestion === null ? null : { key: suggestion.key, reason: reasonFor(suggestion.basis, clash, wa) };
}

function reasonFor(basis: SuggestionBasis, clash: LandingClash, wa: WorkbookAssessment): string {
  switch (basis.kind) {
    case 'authority':
      return basis.tier === 'owner'
        ? `${basis.winner}’s claim names ${describeTarget(clash.target, wa)}`
        : `outside ${basis.loser}’s claims`;
    case 'evidence':
      return `${basis.winner} attached evidence`;
    case 'knowledge':
      return `${basis.knew} knew; ${basis.didNot} did not`;
    case 'scope':
      return `${basis.excludedBy} marked it not applicable`;
    case 'grain':
      return 'the strata are the finer grain — the engine supersedes a roll-up under a split';
  }
}

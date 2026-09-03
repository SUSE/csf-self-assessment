import type {
  Answer,
  AnswerSnapshot,
  Assessment,
  ClashResolution,
  EstateBase,
  Landing,
  LedgerCandidate,
  LedgerDecision,
  LedgerRecord,
  PartyDecision,
  Target,
  WorkbookAssessment,
} from '../schema';
import { assessmentOf, retractPlacement, setAnswer, targetKey } from '../assessment';
import type { LandingClash, LandingUnit, ReviewCandidate } from './clash-types';
import { reviewLanding } from './review';
import { resolveClash } from './resolve';
import { snapshotOf } from './snapshot';

// Committing one reviewed partial onto the estate base (merge.md §2.1.2). One
// press of Land appends exactly one Landing (landing-history §2.1).

const FACILITATOR = 'facilitator';

const unitKey = (questionId: string, target: Target): string => `${questionId} ${targetKey(target)}`;

export type LandingDecisions = {
  resolutions: ClashResolution[];
  partyDecisions: PartyDecision[];
};

/** What the app shell stamps at the Land boundary (invariant #3). `note` is the
 *  raw field value; `land` trims it and omits an empty one. */
export type LandingStamp = { id: string; at: string; note: string };

export type LandingRefusal =
  | { kind: 'undecided'; undecided: LandingClash[] }
  | { kind: 'duplicate-id'; id: string }
  | { kind: 'nothing-to-land' };

export type LandingOutcome =
  | { ok: true; base: EstateBase; ledger: Landing[] }
  | { ok: false; refusal: LandingRefusal };

/** One answer unit this landing writes: what stands there afterwards (null =
 *  the unit is emptied by a grain decision), every candidate seen, and the
 *  decision behind it. The single source of BOTH the ledger records and the
 *  resulting answers, so the committed base and the previewed base can never
 *  disagree. */
export type UnitOutcome = {
  questionId: string;
  target: Target;
  candidates: ReviewCandidate[];
  answer: Answer | null;
  decision: LedgerDecision;
};

/** Every unit this landing writes, in unit order, and the clashes still
 *  undecided — whose units are omitted, so a preview simply leaves them alone. */
export function landingOutcomes(
  units: LandingUnit[],
  resolutions: ClashResolution[],
): { outcomes: UnitOutcome[]; undecided: LandingClash[] } {
  const byKey = new Map(resolutions.map((r) => [unitKey(r.questionId, r.target), r]));
  const outcomes: UnitOutcome[] = [];
  const undecided: LandingClash[] = [];
  for (const unit of units) {
    if (unit.kind === 'sole-source') {
      outcomes.push({
        questionId: unit.questionId,
        target: unit.target,
        candidates: [unit.candidate],
        answer: unit.candidate.answer,
        decision: { kind: 'sole-source', from: unit.candidate.from },
      });
      continue;
    }
    if (unit.kind === 'agreed') {
      outcomes.push({
        questionId: unit.questionId,
        target: unit.target,
        candidates: unit.candidates,
        answer: unit.answer,
        decision: {
          kind: 'agreed',
          among: [unit.candidates[0].from, unit.candidates[1].from],
          kept: unit.kept,
        },
      });
      continue;
    }
    const resolution = byKey.get(unitKey(unit.questionId, unit.target));
    const resolved = resolveClash(unit, resolution);
    if (resolution === undefined || resolved === null) {
      undecided.push(unit);
      continue;
    }
    for (const outcome of resolved) {
      outcomes.push({
        questionId: unit.questionId,
        target: outcome.target,
        candidates: outcome.candidates,
        answer: outcome.answer,
        decision: {
          kind: 'resolved',
          clash: unit.clash,
          choice: resolution.choice,
          by: FACILITATOR,
          note: resolution.note,
        },
      });
    }
  }
  return { outcomes, undecided };
}

/** Fold outcomes onto an answer set: an emptied unit retracts its placement,
 *  every other sets. */
export function applyOutcomes(answers: Answer[], outcomes: UnitOutcome[]): Answer[] {
  let folded = answers;
  for (const outcome of outcomes) {
    folded =
      outcome.answer === null
        ? retractPlacement(folded, outcome.questionId, outcome.target)
        : setAnswer(folded, outcome.answer);
  }
  return folded;
}

const persist = (candidate: ReviewCandidate): LedgerCandidate => ({
  from: candidate.from,
  answer: snapshotOf(candidate.answer),
  claim: candidate.claim,
  authority: candidate.authority,
});

/** Commit one partial onto the base as ONE Landing (landing-history §2.1).
 *  Atomic: any refusal writes nothing. Identity and time are stamped by the app
 *  shell. Throws if `incoming` carries no participant — `checkPartial` admits
 *  none such. */
export function land(
  base: EstateBase,
  ledger: readonly Landing[],
  incoming: Assessment,
  decisions: LandingDecisions,
  stamp: LandingStamp,
): LandingOutcome {
  const participant = incoming.meta.participant;
  if (participant === undefined) {
    throw new Error('land: partial without participant identity (checkPartial admits none)');
  }
  if (ledger.some((landing) => landing.id === stamp.id)) {
    return { ok: false, refusal: { kind: 'duplicate-id', id: stamp.id } };
  }
  const review = reviewLanding(base, ledger, incoming, decisions.partyDecisions);
  const { outcomes, undecided } = landingOutcomes(review.units, decisions.resolutions);
  if (undecided.length > 0) return { ok: false, refusal: { kind: 'undecided', undecided } };

  const standing = new Map(base.answers.map((a) => [unitKey(a.questionId, a.target), a]));
  const records: LedgerRecord[] = review.decided.map((effect) => ({
    kind: 'party',
    before: effect.before,
    after: effect.after,
    decision: effect.decision,
    affectedTargets: effect.affectedTargets,
  }));
  for (const party of review.additions) {
    records.push({
      kind: 'party',
      before: [],
      after: [party],
      decision: { kind: 'add', party: party.id },
      affectedTargets: [],
    });
  }
  for (const outcome of outcomes) {
    const stood = standing.get(unitKey(outcome.questionId, outcome.target));
    const before: AnswerSnapshot | null = stood === undefined ? null : snapshotOf(stood);
    records.push({
      kind: 'answer',
      questionId: outcome.questionId,
      target: outcome.target,
      before,
      after: outcome.answer === null ? null : snapshotOf(outcome.answer),
      candidates: outcome.candidates.map(persist),
      decision: outcome.decision,
    });
  }
  if (records.length === 0) return { ok: false, refusal: { kind: 'nothing-to-land' } };

  const note = stamp.note.trim();
  const landing: Landing = {
    id: stamp.id,
    at: stamp.at,
    participant: participant.name,
    ...(note === '' ? {} : { note }),
    records,
  };

  return {
    ok: true,
    base: { parties: review.parties, answers: applyOutcomes(base.answers, outcomes) },
    ledger: [...ledger, landing],
  };
}

/** The refusal in the facilitator's words — the shell renders this, never its own
 *  string. */
export function landingRefusalMessage(refusal: LandingRefusal): string {
  switch (refusal.kind) {
    case 'undecided':
      return 'Nothing landed: every clash and provider id collision must be decided first.';
    case 'duplicate-id':
      return `Nothing landed: Landing ${refusal.id} is already in the ledger.`;
    case 'nothing-to-land':
      return 'Nothing to land: this partial changes no answer unit and no provider.';
  }
}

/** Stamp the base as the finalized assessment of record, ledger embedded
 *  (merge.md §2.6). Cannot fail: every clash was decided at landing. */
export function finalizeLanded(
  wa: WorkbookAssessment,
  base: EstateBase,
  ledger: readonly Landing[],
): Assessment {
  return assessmentOf(wa.workbook, wa.meta.estate, base.parties, base.answers, {
    kind: 'finalized',
    workbookAssessment: wa.meta.id,
    ledger: [...ledger],
  });
}

import type {
  Answer,
  Assessment,
  Authority,
  Claim,
  ClashClass,
  DimensionStratumTarget,
  DimensionTarget,
  EstateBase,
  Landing,
  Target,
} from '../schema';
import { strataOf, targetKey } from '../assessment';
import { candidateProvenance } from './authority';
import { standingCandidate, unitHistory } from './ledger';

// Judging one incoming partial's answer units against the estate base
// — the unit vocabulary and the classifier itself. Pure — no
// clock, no ids minted.

const BASE_SOURCE = 'the estate base';

// One candidate as the REVIEW holds it: a whole `Answer`, because a resolution
// folds it onto the base. `LedgerCandidate` (schema) is the persisted twin.
export type ReviewCandidate = {
  from: string;
  answer: Answer;
  claim: Claim | null;
  authority: Authority;
};

export const unitKey = (questionId: string, target: Target): string =>
  `${questionId} ${targetKey(target)}`;

export type AgreedUnit = {
  kind: 'agreed';
  questionId: string;
  target: Target;
  candidates: [ReviewCandidate, ReviewCandidate];
  kept: string;
  answer: Answer;
};

export type SoleSourceUnit = {
  kind: 'sole-source';
  questionId: string;
  target: Target;
  candidate: ReviewCandidate;
};

// One answer unit the base and the incoming partial answer differently.
export type UnitClash = {
  kind: 'unit-clash';
  clash: Exclude<ClashClass, 'grain'>;
  questionId: string;
  target: Target;
  base: ReviewCandidate;
  incoming: ReviewCandidate;
};

export type GrainStratum = {
  stratum: string;
  target: DimensionStratumTarget;
  candidate: ReviewCandidate;
};

// The same question about the same dimension answered at different depths —
// a whole-dimension roll-up on one side, stratum refinements on the other. It
// spans the roll-up unit AND every stratum unit; its resolution is keyed by
// the roll-up target.
export type GrainClash = {
  kind: 'grain-clash';
  clash: 'grain';
  questionId: string;
  dimension: string;
  target: DimensionTarget;
  rollUp: ReviewCandidate;
  // In workbook stratum order.
  strata: GrainStratum[];
  // Which side of this landing supplied the roll-up; the strata came from the other.
  rollUpSide: 'base' | 'incoming';
};

export type LandingClash = UnitClash | GrainClash;
export type LandingUnit = AgreedUnit | SoleSourceUnit | LandingClash;

export function isClash(unit: LandingUnit): unit is LandingClash {
  return unit.kind === 'unit-clash' || unit.kind === 'grain-clash';
}

// Every candidate answer a clash puts in play — the wheel's conflict markers.
export function clashCandidates(clash: LandingClash): ReviewCandidate[] {
  return clash.kind === 'unit-clash'
    ? [clash.base, clash.incoming]
    : [clash.rollUp, ...clash.strata.map((s) => s.candidate)];
}

// A unit clash's class (Decision 3): either side n/a asks whether the question
// applies at all, which outranks either side not knowing.
function classOf(base: Answer, incoming: Answer): Exclude<ClashClass, 'grain'> {
  if (base.state === 'na' || incoming.state === 'na') return 'scope';
  if (base.state === 'dont-know' || incoming.state === 'dont-know') return 'gap';
  return 'divergence';
}

// Every answer unit the incoming partial touches, judged against the base.
// Party ids are assumed already reconciled — call `reviewLanding` for the
// whole picture.
export function classify(
  base: EstateBase,
  ledger: readonly Landing[],
  incoming: Assessment,
): LandingUnit[] {
  const participant = incoming.meta.participant;
  if (participant === undefined) {
    throw new Error('classify: partial without participant identity (checkPartial admits none)');
  }
  const name = participant.name;
  const claims = incoming.claims ?? [];
  const baseAnswers = new Map(base.answers.map((a) => [unitKey(a.questionId, a.target), a]));
  const incomingCandidateOf = (answer: Answer): ReviewCandidate => ({
    from: name,
    answer: { ...answer, gesture: { ...answer.gesture, groupId: `${name}:${answer.gesture.groupId}` } },
    ...candidateProvenance(incoming.workbook, claims, answer),
  });
  const baseCandidateAt = (answer: Answer): ReviewCandidate =>
    baseCandidateOf(ledger, answer.questionId, answer.target, answer);

  const grainGroups = grainGroupsOf(base, incoming, incomingCandidateOf, baseCandidateAt);
  const emitted = new Set<string>();

  return incoming.answers.flatMap((answer): LandingUnit[] => {
    const group = grainGroups.get(grainKey(answer.questionId, dimensionOf(answer.target) ?? ''));
    if (group !== undefined) {
      const key = grainKey(group.questionId, group.dimension);
      if (emitted.has(key)) return [];
      emitted.add(key);
      return [group];
    }
    const incomingCandidate = incomingCandidateOf(answer);
    const namespaced = incomingCandidate.answer;
    const questionId = answer.questionId;
    const target = answer.target;
    const standing = baseAnswers.get(unitKey(questionId, target));
    if (standing === undefined) {
      return [{ kind: 'sole-source', questionId, target, candidate: incomingCandidate }];
    }
    const baseCandidate = baseCandidateAt(standing);
    if (!agrees(standing, namespaced)) {
      return [
        {
          kind: 'unit-clash',
          clash: classOf(standing, namespaced),
          questionId,
          target,
          base: baseCandidate,
          incoming: incomingCandidate,
        },
      ];
    }
    const keepIncoming = !hasEvidence(standing) && hasEvidence(namespaced);
    return [
      {
        kind: 'agreed',
        questionId,
        target,
        candidates: [baseCandidate, incomingCandidate],
        kept: keepIncoming ? incomingCandidate.from : baseCandidate.from,
        answer: keepIncoming ? namespaced : standing,
      },
    ];
  });
}

const grainKey = (questionId: string, dimension: string): string => `${questionId} ${dimension}`;

const dimensionOf = (target: Target): string | null =>
  target.kind === 'dimension' || target.kind === 'dimension-stratum' ? target.dimension : null;

// The grain groups this landing folds (Decision 2): for each (questionId,
// dimension) the incoming partial touches, the roll-up comes from whichever side
// holds one and the strata from whichever side holds any — a grain clash only
// when both exist on OPPOSITE sides.
function grainGroupsOf(
  base: EstateBase,
  incoming: Assessment,
  incomingCandidateOf: (answer: Answer) => ReviewCandidate,
  baseCandidateAt: (answer: Answer) => ReviewCandidate,
): Map<string, GrainClash> {
  const groups = new Map<string, GrainClash>();
  const touched = new Map<string, { questionId: string; dimension: string }>();
  for (const answer of incoming.answers) {
    const dimension = dimensionOf(answer.target);
    if (dimension === null) continue;
    touched.set(grainKey(answer.questionId, dimension), { questionId: answer.questionId, dimension });
  }

  for (const { questionId, dimension } of touched.values()) {
    const rollUpFrom = (answers: Answer[]): Answer | undefined =>
      answers.find(
        (a) => a.questionId === questionId && a.target.kind === 'dimension' && a.target.dimension === dimension,
      );
    const strataFrom = (answers: Answer[]): Answer[] =>
      answers.filter(
        (a) =>
          a.questionId === questionId && a.target.kind === 'dimension-stratum' && a.target.dimension === dimension,
      );

    const incomingRollUp = rollUpFrom(incoming.answers);
    const baseRollUp = rollUpFrom(base.answers);
    const incomingStrata = strataFrom(incoming.answers);
    const baseStrata = strataFrom(base.answers);

    const rollUpSide = incomingRollUp !== undefined ? 'incoming' : 'base';
    const rollUpAnswer = incomingRollUp ?? baseRollUp;
    const strataSide = incomingStrata.length > 0 ? 'incoming' : 'base';
    const strataAnswers = incomingStrata.length > 0 ? incomingStrata : baseStrata;

    if (rollUpAnswer === undefined || strataAnswers.length === 0 || rollUpSide === strataSide) continue;

    const order = strataOf(incoming.workbook, dimension);
    const ordered = [...strataAnswers].sort(
      (a, b) => order.indexOf(stratumOf(a.target)) - order.indexOf(stratumOf(b.target)),
    );
    const candidateOn = strataSide === 'incoming' ? incomingCandidateOf : baseCandidateAt;
    const strata: GrainStratum[] = ordered.flatMap((answer) =>
      answer.target.kind === 'dimension-stratum'
        ? [{ stratum: answer.target.stratum, target: answer.target, candidate: candidateOn(answer) }]
        : [],
    );

    groups.set(grainKey(questionId, dimension), {
      kind: 'grain-clash',
      clash: 'grain',
      questionId,
      dimension,
      target: { kind: 'dimension', dimension },
      rollUp: rollUpSide === 'incoming' ? incomingCandidateOf(rollUpAnswer) : baseCandidateAt(rollUpAnswer),
      strata,
      rollUpSide,
    });
  }
  return groups;
}

const stratumOf = (target: Target): string => (target.kind === 'dimension-stratum' ? target.stratum : '');

// The base side's provenance comes from the last answer record naming the unit.
// The standing ANSWER comes from the caller, never rebuilt from the record's
// snapshot. The fallback is unreachable for a base built by `land`.
function baseCandidateOf(
  ledger: readonly Landing[],
  questionId: string,
  target: Target,
  standing: Answer,
): ReviewCandidate {
  const history = unitHistory(ledger, questionId, target);
  const last = history[history.length - 1];
  const candidate = last === undefined ? null : standingCandidate(last.record);
  return candidate === null
    ? { from: BASE_SOURCE, answer: standing, claim: null, authority: 'out-of-claim' }
    : { from: candidate.from, answer: standing, claim: candidate.claim, authority: candidate.authority };
}

// Same state — and, when answered, the same rung — is agreement. Evidence and
// gesture differences never clash.
function agrees(a: Answer, b: Answer): boolean {
  if (a.state !== b.state) return false;
  return a.state !== 'answered' || b.state !== 'answered' || a.rungId === b.rungId;
}

function hasEvidence(answer: Answer): boolean {
  return answer.state === 'answered' && answer.evidence !== undefined;
}

import { WorkbookSchema } from '../schema';
import type {
  Answer,
  AnswerLedgerRecord,
  Assessment,
  Claim,
  ClashResolution,
  EstateBase,
  Landing,
  Party,
  PartyDecision,
  Seal,
  Target,
  Workbook,
  WorkbookAssessment,
} from '../schema';
import { assessmentOf } from '../assessment';
import { snapshotOf } from './snapshot';
import type { LandingUnit } from './clash-types';
import type { LandingReview } from './review';
import { land } from './land';
import type { LandingStamp } from './land';

const LADDER_SEALS = [0, 1, 2, 3, 4];
const rungs = (seals: number[]) =>
  seals.map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal }));

/** Both fixture ladders are `rungs(LADDER_SEALS)`, so a SEAL names exactly one rung. */
const rungIdFor = (seal: Seal): string => {
  const i = LADDER_SEALS.indexOf(seal);
  if (i < 0) throw new Error(`no rung at SEAL ${seal} on the synthetic ladder`);
  return `choice-${i + 1}`;
};

/** One dimension question over a splittable storage and a whole security, plus a party question. */
export const WB: Workbook = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  dimensions: [
    { id: 'storage', name: 'Storage', critical: true, strata: ['service', 'software', 'hardware', 'chips'] },
    { id: 'security', name: 'Security', critical: true },
  ],
  roles: [{ id: 'SEC', name: 'Security' }],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'subprocessor', name: 'Subprocessor', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Tech',
      weight: 100,
      questions: [
        {
          id: 'SOV-1.dq',
          grain: 'dimension',
          appliesTo: ['storage', 'security'],
          text: 'q?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: rungs(LADDER_SEALS),
        },
        {
          id: 'SOV-1.pq',
          grain: 'party',
          text: 'p?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: rungs(LADDER_SEALS),
        },
      ],
    },
  ],
});

export const INST: Party = { id: 'inst', name: 'Institution', type: 'institution', serves: [] };
export const ACME: Party = { id: 'acme-cloud', name: 'Acme Cloud', type: 'subprocessor', serves: ['compute'] };
export const ACME_EU: Party = { id: 'acme-eu', name: 'Acme EU', type: 'subprocessor', serves: ['edge'] };
export const NORTHSTAR: Party = { id: 'northstar-edge', name: 'Northstar Edge', type: 'subprocessor', serves: ['edge'] };

export const WA: WorkbookAssessment = {
  meta: { id: 'wa-1', estate: 'E', workbookId: 'wb', workbookVersion: '1.0.0', createdAt: 'T0' },
  workbook: WB,
  parties: [INST],
};

export const STORAGE: Target = { kind: 'dimension', dimension: 'storage' };
export const SECURITY: Target = { kind: 'dimension', dimension: 'security' };
export const G = { groupId: 'g1', placement: 'individual' as const };

export const stratum = (name: string): Target => ({ kind: 'dimension-stratum', dimension: 'storage', stratum: name });

export const answered = (target: Target, seal: Seal, evidence?: string): Answer => ({
  questionId: 'SOV-1.dq',
  target,
  state: 'answered',
  rungId: rungIdFor(seal),
  gesture: G,
  ...(evidence === undefined ? {} : { evidence }),
});

export const dontKnow = (target: Target): Answer => ({
  questionId: 'SOV-1.dq',
  target,
  state: 'dont-know',
  gesture: G,
});

export const na = (target: Target): Answer => ({ questionId: 'SOV-1.dq', target, state: 'na', gesture: G });

export const onParty = (party: string, seal: Seal = 2): Answer => ({
  questionId: 'SOV-1.pq',
  target: { kind: 'party', party },
  state: 'answered',
  rungId: rungIdFor(seal),
  gesture: G,
});

export const partial = (
  name: string,
  answers: Answer[],
  claims: Claim[] = [],
  partiesAdded: Party[] = [],
): Assessment =>
  assessmentOf(WB, 'E', [INST], answers, {
    kind: 'partial',
    workbookAssessment: 'wa-1',
    participant: { name },
    claims,
    partiesAdded,
  });

export const EMPTY_BASE: EstateBase = { parties: [INST], answers: [] };
export const NO_DECISIONS = { resolutions: [] as ClashResolution[], partyDecisions: [] as PartyDecision[] };

export const L1 = '11111111-1111-4111-8111-111111111111';
export const L2 = '22222222-2222-4222-8222-222222222222';
export const L3 = '33333333-3333-4333-8333-333333333333';
export const stamp = (id: string, at: string, note = ''): LandingStamp => ({ id, at, note });

/** Alex holds storage, security and one provider — the partial every "over Alex" case starts from. */
export const ALEX = partial('Alex', [answered(STORAGE, 2), answered(SECURITY, 3), onParty('acme-cloud', 2)]);

/** Alex's landing, done through `land` so the ledger is the real thing. */
export function afterAlex(base: EstateBase = { parties: [INST, ACME], answers: [] }) {
  const outcome = land(base, [], ALEX, NO_DECISIONS, stamp(L1, 'T1'));
  if (!outcome.ok) throw new Error('Alex should land cleanly');
  return outcome;
}

/** A hand-built divergence, for the summary cases that need a clash without landing one. */
export const clashUnit = (questionId: string): LandingUnit => ({
  kind: 'unit-clash',
  clash: 'divergence',
  questionId,
  target: STORAGE,
  base: { from: 'Alex', answer: answered(STORAGE, 2), claim: null, authority: 'out-of-claim' },
  incoming: { from: 'Jane', answer: answered(STORAGE, 3), claim: null, authority: 'out-of-claim' },
});

/** The summary reads a whole review; unit-only cases wrap theirs in an otherwise empty one. */
export const reviewOf = (units: LandingUnit[]): LandingReview => ({
  parties: [INST],
  incoming: partial('Jane', []),
  additions: [],
  pairs: [],
  decided: [],
  units,
});

const alexRecord = (answer: Answer): AnswerLedgerRecord => ({
  kind: 'answer',
  questionId: answer.questionId,
  target: answer.target,
  before: null,
  after: snapshotOf(answer),
  candidates: [{ from: 'Alex', answer: snapshotOf(answer), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
});

/** A base holding Alex's landed answers, each with the ledger record behind it. */
export const landedBase = (answers: Answer[]): { base: EstateBase; ledger: Landing[] } => {
  const landed = answers.map((answer) => ({
    ...answer,
    gesture: { ...answer.gesture, groupId: `Alex:${answer.gesture.groupId}` },
  }));
  return {
    base: { parties: [INST], answers: landed },
    ledger: [{ id: L1, at: 'T1', participant: 'Alex', records: landed.map(alexRecord) }],
  };
};

import type {
  AnswerLedgerRecord,
  AnswerSnapshot,
  Landing,
  LandingEnvelope,
  Party,
  PartyLedgerRecord,
  Seal,
  Workbook,
  WorkbookAssessment,
} from '../schema';
import type { DetailContext } from './detail-context';

export const L1 = '11111111-1111-4111-8111-111111111111';
export const L2 = '22222222-2222-4222-8222-222222222222';
export const L3 = '33333333-3333-4333-8333-333333333333';

export const LADDER = [
  { id: 'choice-1', description: 'Documented.', points: 50, seal: 2 as const },
  { id: 'choice-2', description: 'Verified.', points: 75, seal: 3 as const },
];

export const WORKBOOK: Workbook = {
  meta: { id: 'csf-estate', version: '2', title: 'CSF estate workbook' },
  frontSheet: [],
  sealLevels: [
    { seal: 2, name: 'Documented', description: 'Written down.' },
    { seal: 3, name: 'Verified', description: 'Checked by someone else.' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: false },
    { id: 'security', name: 'Security', critical: false },
  ],
  roles: [{ id: 'ARCH', name: 'Architect' }],
  parties: [
    { id: 'assessed-us', name: 'Our estate', kind: 'assessed' },
    { id: 'provider', name: 'Cloud provider', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Transparency',
      weight: 50,
      questions: [
        {
          id: 'SOV-1.q1',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'Which regions hold the workload?',
          why: 'Location matters.',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
        {
          id: 'SOV-1.q2',
          grain: 'dimension',
          appliesTo: ['security'],
          text: 'Who holds the encryption keys?',
          why: 'Control matters.',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
      ],
    },
    {
      id: 'SOV-2',
      name: 'Exit',
      weight: 50,
      questions: [
        {
          id: 'SOV-2.q1',
          grain: 'party',
          axis: 'assessment',
          text: 'Can the estate withdraw within 90 days?',
          why: 'Exit matters.',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: LADDER,
        },
      ],
    },
  ],
  testEstates: [],
  recommendations: [],
};

export const EXIT = { id: 'SOV-2', name: 'Exit' };

export const PARTIES: Party[] = [
  { id: 'northwind', name: 'Northwind', type: 'assessed-us', serves: [] },
  { id: 'acme-cloud', name: 'Acme Cloud EU', type: 'provider', serves: ['compute'] },
  { id: 'jane:acme-eu', name: 'Acme Cloud Europe SAS', type: 'provider', serves: ['security'] },
];

const WA: WorkbookAssessment = {
  meta: {
    id: 'wa-1',
    estate: 'Northwind production estate',
    workbookId: 'csf-estate',
    workbookVersion: '2',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  workbook: WORKBOOK,
  parties: PARTIES,
};

export const ctx: DetailContext = { workbookAssessment: WA, parties: PARTIES, viewer: { locale: 'en-GB', zone: 'UTC' } };

export const G = { groupId: 'g1', placement: 'individual' as const };
export const QUESTION = { ladder: LADDER };
export const snap = (seal: Seal): AnswerSnapshot => {
  const rung = LADDER.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal} on the detail ladder`);
  return { state: 'answered', rungId: rung.id, gesture: G };
};

export const JANE_SNAP: AnswerSnapshot = {
  state: 'answered',
  rungId: 'choice-2',
  evidence: 'Security review 2026-08',
  gesture: { groupId: 'Jane:g4', placement: 'individual' },
};

export const ABSORB: PartyLedgerRecord = {
  kind: 'party',
  before: [PARTIES[1], PARTIES[2]],
  after: [{ id: 'acme-cloud', name: 'Acme Cloud Europe SAS', type: 'provider', serves: ['compute', 'security'] }],
  decision: {
    kind: 'absorb',
    from: 'jane:acme-eu',
    into: 'acme-cloud',
    name: 'Acme Cloud Europe SAS',
    by: 'facilitator',
    note: 'Same contracted provider',
  },
  affectedTargets: [
    {
      questionId: 'SOV-2.q1',
      before: { kind: 'party', party: 'jane:acme-eu' },
      after: { kind: 'party', party: 'acme-cloud' },
    },
  ],
};

export const ADD: PartyLedgerRecord = {
  kind: 'party',
  before: [],
  after: [{ id: 'acme-new', name: 'Northwind Edge', type: 'provider', serves: ['compute'] }],
  decision: { kind: 'add', party: 'acme-new' },
  affectedTargets: [],
};

export const RENAME: PartyLedgerRecord = {
  ...ABSORB,
  after: [{ id: 'acme-cloud', name: 'Acme Cloud Europe', type: 'provider', serves: ['compute'] }],
  decision: { kind: 'rename', party: 'acme-cloud', name: 'Acme Cloud Europe', by: 'facilitator', note: '' },
};

export const SPLIT: PartyLedgerRecord = {
  ...ABSORB,
  after: [
    { id: 'acme-cloud', name: 'Acme Cloud EU', type: 'provider', serves: ['compute'] },
    { id: 'jane:acme-eu-2', name: 'Acme Cloud Europe SAS', type: 'provider', serves: ['security'] },
  ],
  decision: { kind: 'split', from: 'acme-cloud', id: 'jane:acme-eu-2', by: 'facilitator', note: '' },
};

/** Jane's answer taken over Alex's, with her claim on the record. */
export const RESOLVED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-2.q1',
  target: { kind: 'assessment' },
  before: snap(2),
  after: JANE_SNAP,
  candidates: [
    { from: 'Alex', answer: snap(2), claim: null, authority: 'out-of-claim' },
    {
      from: 'Jane',
      answer: JANE_SNAP,
      claim: { roles: ['ARCH'], dimensions: ['security'], parties: [] },
      authority: 'owner',
    },
  ],
  decision: {
    kind: 'resolved',
    clash: 'divergence',
    choice: { kind: 'take', from: 'Jane' },
    by: 'facilitator',
    note: 'Jane’s claim names the security dimension',
  },
};

export const ALEX_SOLE: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-1.q2',
  target: { kind: 'dimension', dimension: 'security' },
  before: null,
  after: snap(2),
  candidates: [{ from: 'Alex', answer: snap(2), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

export const AGREED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-1.q1',
  target: { kind: 'dimension', dimension: 'compute' },
  before: snap(2),
  after: snap(2),
  candidates: [
    { from: 'Alex', answer: snap(2), claim: null, authority: 'out-of-claim' },
    { from: 'Jane', answer: snap(2), claim: null, authority: 'out-of-claim' },
  ],
  decision: { kind: 'agreed', among: ['Alex', 'Jane'], kept: 'Alex' },
};

/** A record for a question the workbook does not carry — it lands in "Other records". */
export const UNPLACED: AnswerLedgerRecord = {
  kind: 'answer',
  questionId: 'SOV-9.qX',
  target: { kind: 'dimension-stratum', dimension: 'compute', stratum: 'hot' },
  before: null,
  after: snap(2),
  candidates: [{ from: 'Alex', answer: snap(2), claim: null, authority: 'out-of-claim' }],
  decision: { kind: 'sole-source', from: 'Alex' },
};

const E_ALEX_1: LandingEnvelope = { id: L1, at: '2026-08-09T22:15:00.000Z', participant: 'Alex' };

export const ALEX_1: Landing = { ...E_ALEX_1, records: [ALEX_SOLE] };

export const JANE: Landing = {
  id: L2,
  at: '2026-08-10T12:32:18.422Z',
  participant: 'Jane',
  note: 'after the security discussion',
  records: [ABSORB, RESOLVED],
};

export const ALEX_2: Landing = { id: L3, at: '2026-08-10T20:05:00.000Z', participant: 'Alex', records: [ALEX_SOLE] };

export const LEDGER = [ALEX_1, JANE, ALEX_2];

/** Jane's Landing with one record of every kind the navigator groups. */
export const BIG: Landing = { ...JANE, records: [ABSORB, AGREED, RESOLVED, ALEX_SOLE, UNPLACED] };
export const BIG_LEDGER = [ALEX_1, BIG, ALEX_2];

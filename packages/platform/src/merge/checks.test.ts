import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type {
  Answer,
  Assessment,
  Claim,
  ClashResolution,
  EstateBase,
  Party,
  Seal,
  Target,
  Workbook,
  WorkbookAssessment,
} from '../schema';
import { assessmentOf } from '../assessment';
import { reviewLanding } from './review';
import { landingChecks } from './checks';

const WB: Workbook = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true, strata: ['chips', 'servers'] },
    { id: 'edge', name: 'Edge' },
  ],
  roles: [{ id: 'SEC', name: 'Security' }],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'provider', name: 'Provider', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Tech',
      weight: 50,
      questions: [
        {
          id: 'SOV-1.dq',
          grain: 'dimension',
          appliesTo: ['compute', 'edge'],
          text: 'q?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
        },
      ],
    },
    {
      id: 'SOV-2',
      name: 'Legal',
      weight: 50,
      questions: [
        {
          id: 'SOV-2.pq',
          grain: 'party',
          axis: 'party',
          text: 'p?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
        },
      ],
    },
  ],
});

const INST: Party = { id: 'inst', name: 'Institution', type: 'institution', serves: [] };
const ACME: Party = { id: 'acme', name: 'Acme Cloud', type: 'provider', serves: ['compute'] };
const NEW_PROVIDER: Party = { id: 'nordics', name: 'Nordics Datacenter AB', type: 'provider', serves: ['compute'] };

const WA: WorkbookAssessment = {
  meta: { id: 'wa-1', estate: 'E', workbookId: 'wb', workbookVersion: '1.0.0', createdAt: 'T0' },
  workbook: WB,
  parties: [INST, ACME],
};

const COMPUTE: Target = { kind: 'dimension', dimension: 'compute' };
const EDGE: Target = { kind: 'dimension', dimension: 'edge' };
const G = { groupId: 'g1', placement: 'individual' as const };

const dim = (target: Target, seal: Seal): Answer => ({
  questionId: 'SOV-1.dq',
  target,
  state: 'answered',
  rungId: `choice-${seal + 1}`,
  gesture: G,
});

const dimDontKnow = (target: Target): Answer => ({
  questionId: 'SOV-1.dq',
  target,
  state: 'dont-know',
  gesture: G,
});

const party = (id: string, seal: Seal): Answer => ({
  questionId: 'SOV-2.pq',
  target: { kind: 'party', party: id },
  state: 'answered',
  rungId: `choice-${seal + 1}`,
  gesture: G,
});

const partial = (
  name: string,
  answers: Answer[],
  claims: Claim[] = [],
  partiesAdded: Party[] = [],
): Assessment =>
  assessmentOf(WB, 'E', [INST, ACME], answers, {
    kind: 'partial',
    workbookAssessment: 'wa-1',
    participant: { name },
    claims,
    partiesAdded,
  });

const EMPTY_BASE: EstateBase = { parties: [INST, ACME], answers: [] };

const checksOf = (base: EstateBase, incoming: Assessment, resolutions: ClashResolution[] = []) =>
  landingChecks(WA, base, reviewLanding(base, [], incoming, []), resolutions);

describe('landingChecks', () => {
  it('the floor preview reads the base plus this landing’s undisputed units', () => {
    const checks = checksOf(EMPTY_BASE, partial('Jane', [dim(COMPUTE, 1), dim(EDGE, 3)]));
    expect(checks.floor.seal).toBe(1);
    expect(checks.floor.binding).toEqual([
      { questionId: 'SOV-1.dq', label: 'Compute', seal: 1, targetKey: 'dimension:compute' },
    ]);
    expect(checks.undecided).toBe(0);
  });

  it('unlocksTo is the floor lifting every binding would reach', () => {
    // Compute (critical) pins the floor at 1; Acme's party answer is the next
    // gating level above it, so lifting Compute past 1 would read 3. Edge is not
    // critical, so its answer never gates and never appears on the climb.
    const checks = checksOf(
      EMPTY_BASE,
      partial('Jane', [dim(COMPUTE, 1), dim(EDGE, 0), party('acme', 3)]),
    );
    expect(checks.floor.seal).toBe(1);
    expect(checks.floor.unlocksTo).toBe(3);
  });

  it('unlocksTo is null when the floor is the only gating level', () => {
    // Edge is not critical, so the one gating answer is Compute: lifting it
    // leaves nothing else pinning the estate, and there is no next rung to name.
    const checks = checksOf(EMPTY_BASE, partial('Jane', [dim(COMPUTE, 1), dim(EDGE, 0)]));
    expect(checks.floor.unlocksTo).toBeNull();
  });

  it('coverage and don’t-knows come from the prospective evaluation', () => {
    const checks = checksOf(
      EMPTY_BASE,
      partial('Jane', [dim(COMPUTE, 1), dimDontKnow(EDGE), party('inst', 3), party('acme', 3)]),
    );
    expect(checks.coverage).toEqual({ placed: 4, total: 4 });
    expect(checks.dontKnow).toBe(1);
  });

  it('outOfClaim counts the incoming answers no claim of theirs covers', () => {
    const claim: Claim = { roles: ['SEC'], dimensions: ['compute'], parties: [] };
    const checks = checksOf(
      EMPTY_BASE,
      partial('Jane', [dim(COMPUTE, 1), dim(EDGE, 3), party('acme', 2)], [claim]),
    );
    expect(checks.outOfClaim).toBe(2);
  });

  it('undecided counts the clashes with no resolution', () => {
    const base: EstateBase = { parties: [INST, ACME], answers: [dim(COMPUTE, 2), dim(EDGE, 2)] };
    const incoming = partial('Jane', [dim(COMPUTE, 1), dim(EDGE, 1)]);
    expect(checksOf(base, incoming).undecided).toBe(2);
    expect(
      checksOf(base, incoming, [
        { questionId: 'SOV-1.dq', target: COMPUTE, choice: { kind: 'take', from: 'Jane' }, note: '' },
      ]).undecided,
    ).toBe(1);
    expect(
      checksOf(base, incoming, [
        { questionId: 'SOV-1.dq', target: COMPUTE, choice: { kind: 'take', from: 'Jane' }, note: '' },
        { questionId: 'SOV-1.dq', target: EDGE, choice: { kind: 'take', from: 'Jane' }, note: '' },
      ]).undecided,
    ).toBe(0);
  });

  it('the preview is prospective: deciding a clash moves the floor', () => {
    const base: EstateBase = { parties: [INST, ACME], answers: [dim(COMPUTE, 2)] };
    const incoming = partial('Jane', [dim(COMPUTE, 0)]);
    expect(checksOf(base, incoming).floor.seal).toBe(2);
    expect(
      checksOf(base, incoming, [
        { questionId: 'SOV-1.dq', target: COMPUTE, choice: { kind: 'take', from: 'Jane' }, note: '' },
      ]).floor.seal,
    ).toBe(0);
  });

  it('a party this landing adds reads by name in the binding', () => {
    const incoming = partial('Jane', [party('nordics', 0)], [], [NEW_PROVIDER]);
    const checks = checksOf(EMPTY_BASE, incoming);
    expect(checks.floor.seal).toBe(0);
    expect(checks.floor.binding).toEqual([
      { questionId: 'SOV-2.pq', label: 'Nordics Datacenter AB', seal: 0, targetKey: 'party:nordics' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import type {
  Answer,
  Authority,
  Question,
  Seal,
  Target,
  Workbook,
  WorkbookAssessment,
} from '../schema';
import { WorkbookSchema } from '../schema';
import type { GrainClash, LandingClash, ReviewCandidate, UnitClash } from './clash-types';
import { optionsFor } from './choices';
import { suggest, suggestedChoice } from './suggest';

const WB: Workbook = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: `d${seal}` })),
  dimensions: [{ id: 'compute', name: 'Compute', critical: true, strata: ['chips', 'servers'] }],
  roles: [{ id: 'SEC', name: 'Security' }],
  parties: [{ id: 'institution', name: 'Institution', kind: 'assessed' }],
  objectives: [
    {
      id: 'SOV-1',
      name: 'Tech',
      weight: 100,
      questions: [
        {
          id: 'SOV-1.dq',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'q?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
        },
      ],
    },
  ],
});

const QUESTION: Question = WB.objectives[0].questions[0];

const WA: WorkbookAssessment = {
  meta: { id: 'wa-1', workbookId: 'wb', workbookVersion: '1.0.0', estate: 'E', createdAt: 'T0' },
  workbook: WB,
  parties: [{ id: 'inst', name: 'Institution', type: 'institution', serves: [] }],
};

const COMPUTE: Target = { kind: 'dimension', dimension: 'compute' };
const G = { groupId: 'g1', placement: 'individual' as const };

const answered = (seal: Seal, evidence?: string): Answer => ({
  questionId: 'SOV-1.dq',
  target: COMPUTE,
  state: 'answered',
  rungId: `choice-${seal + 1}`,
  gesture: G,
  ...(evidence === undefined ? {} : { evidence }),
});

const dontKnow = (): Answer => ({ questionId: 'SOV-1.dq', target: COMPUTE, state: 'dont-know', gesture: G });
const na = (): Answer => ({ questionId: 'SOV-1.dq', target: COMPUTE, state: 'na', gesture: G });

const candidate = (from: string, answer: Answer, authority: Authority): ReviewCandidate => ({
  from,
  answer,
  claim: null,
  authority,
});

const unitClash = (
  clash: UnitClash['clash'],
  base: ReviewCandidate,
  incoming: ReviewCandidate,
): UnitClash => ({ kind: 'unit-clash', clash, questionId: 'SOV-1.dq', target: COMPUTE, base, incoming });

const grainClash = (): GrainClash => ({
  kind: 'grain-clash',
  clash: 'grain',
  questionId: 'SOV-1.dq',
  dimension: 'compute',
  target: COMPUTE,
  rollUp: candidate('Alex', answered(2), 'blanket'),
  strata: ['chips', 'servers'].map((stratum) => {
    const target: Target = { kind: 'dimension-stratum', dimension: 'compute', stratum };
    return {
      stratum,
      target: { kind: 'dimension-stratum', dimension: 'compute', stratum },
      candidate: candidate('Jane', { ...answered(1), target }, 'owner'),
    };
  }),
  rollUpSide: 'base',
});

const offered = (clash: LandingClash): string[] => optionsFor(clash, QUESTION).map((o) => o.key);

describe('suggest', () => {
  it('the ladder suggests the higher rung on a divergence', () => {
    const clash = unitClash(
      'divergence',
      candidate('Alex', answered(2), 'blanket'),
      candidate('Jane', answered(1), 'owner'),
    );
    expect(suggest(clash)).toEqual({
      key: 'take:Jane',
      choice: { kind: 'take', from: 'Jane' },
      basis: { kind: 'authority', tier: 'owner', winner: 'Jane', loser: 'Alex' },
    });
    expect(suggestedChoice(clash, WA)).toEqual({ key: 'take:Jane', reason: 'Jane’s claim names Compute' });
    expect(offered(clash)).toContain('take:Jane');
  });

  it('a blanket claim outranks an answer outside every claim', () => {
    const clash = unitClash(
      'divergence',
      candidate('Alex', answered(2), 'blanket'),
      candidate('Jane', answered(1), 'out-of-claim'),
    );
    expect(suggest(clash)?.key).toBe('take:Alex');
    expect(suggest(clash)?.basis).toEqual({
      kind: 'authority',
      tier: 'blanket',
      winner: 'Alex',
      loser: 'Jane',
    });
    expect(suggestedChoice(clash, WA)?.reason).toBe('outside Jane’s claims');
  });

  it('within a tier, evidence breaks the tie', () => {
    const clash = unitClash(
      'divergence',
      candidate('Alex', answered(2), 'owner'),
      candidate('Jane', answered(1, 'runbook'), 'owner'),
    );
    expect(suggest(clash)?.key).toBe('take:Jane');
    expect(suggest(clash)?.basis).toEqual({ kind: 'evidence', winner: 'Jane' });
    expect(suggestedChoice(clash, WA)?.reason).toBe('Jane attached evidence');
  });

  it('a full tie suggests nothing', () => {
    const neither = unitClash(
      'divergence',
      candidate('Alex', answered(2), 'owner'),
      candidate('Jane', answered(1), 'owner'),
    );
    expect(suggest(neither)).toBeNull();
    expect(suggestedChoice(neither, WA)).toBeNull();

    const both = unitClash(
      'divergence',
      candidate('Alex', answered(2, 'policy'), 'owner'),
      candidate('Jane', answered(1, 'runbook'), 'owner'),
    );
    expect(suggest(both)).toBeNull();
  });

  it('a gap takes the knowledge, whatever the ladder says', () => {
    const clash = unitClash(
      'gap',
      candidate('Alex', answered(2), 'out-of-claim'),
      candidate('Jane', dontKnow(), 'owner'),
    );
    expect(suggest(clash)?.key).toBe('take:Alex');
    expect(suggest(clash)?.basis).toEqual({ kind: 'knowledge', knew: 'Alex', didNot: 'Jane' });
    expect(suggestedChoice(clash, WA)?.reason).toBe('Alex knew; Jane did not');
    expect(offered(clash)).toContain('take:Alex');
  });

  it('a scope clash takes the exclusion', () => {
    const clash = unitClash(
      'scope',
      candidate('Alex', answered(2), 'owner'),
      candidate('Jane', na(), 'owner'),
    );
    expect(suggest(clash)?.key).toBe('take:Jane');
    expect(suggest(clash)?.basis).toEqual({ kind: 'scope', excludedBy: 'Jane' });
    expect(suggestedChoice(clash, WA)?.reason).toBe('Jane marked it not applicable');
    expect(offered(clash)).toContain('take:Jane');
  });

  it('a grain clash keeps the strata', () => {
    const clash = grainClash();
    expect(suggest(clash)).toEqual({
      key: 'grain:strata',
      choice: { kind: 'grain', keep: 'strata' },
      basis: { kind: 'grain' },
    });
    expect(suggestedChoice(clash, WA)?.reason).toBe(
      'the strata are the finer grain — the engine supersedes a roll-up under a split',
    );
    expect(offered(clash)).toContain('grain:strata');
  });
});

import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import { questionOf } from '../assessment';
import type { Answer, Authority, ClashResolution, Materiality, Seal, Target, Workbook } from '../schema';
import type { GrainClash, LandingClash, ReviewCandidate, UnitClash } from './clash-types';
import {
  NO_FILTER,
  canMoveFloor,
  filterClashes,
  filterSummary,
  isDecided,
  isNonScoring,
  isOneRungApart,
  isQueueNarrowed,
  optionName,
  participantsOf,
  queueFacets,
  queueGroups,
  toggleSwitch,
} from './queue';

const FULL = [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal }));

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
          ladder: FULL,
        },
        {
          id: 'SOV-1.iq',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'i?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'informational',
          ladder: FULL,
        },
        {
          id: 'SOV-1.sparse',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 's?',
          why: 'b',
          role: 'SEC',
          defaultMateriality: 'material',
          ladder: [0, 2, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
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
          ladder: FULL,
        },
      ],
    },
  ],
});

const COMPUTE: Target = { kind: 'dimension', dimension: 'compute' };
const EDGE: Target = { kind: 'dimension', dimension: 'edge' };
const CHIPS: Target = { kind: 'dimension-stratum', dimension: 'compute', stratum: 'chips' };
const ACME: Target = { kind: 'party', party: 'acme' };
const G = { groupId: 'g1', placement: 'individual' as const };

// Some cases name a question the workbook does not carry; those keep a plain id.
const rungIdFor = (questionId: string, seal: Seal): string => {
  const question = questionOf(WB, questionId);
  if (question === undefined) return `choice-${seal + 1}`;
  const rung = question.ladder.find((r) => r.seal === seal);
  if (!rung) throw new Error(`no rung at SEAL ${seal} on ${questionId}`);
  return rung.id;
};

const answered = (questionId: string, target: Target, seal: Seal): Answer => ({
  questionId,
  target,
  state: 'answered',
  rungId: rungIdFor(questionId, seal),
  gesture: G,
});
const dontKnow = (questionId: string, target: Target): Answer => ({
  questionId,
  target,
  state: 'dont-know',
  gesture: G,
});
const na = (questionId: string, target: Target): Answer => ({ questionId, target, state: 'na', gesture: G });

const candidate = (from: string, answer: Answer, authority: Authority = 'out-of-claim'): ReviewCandidate => ({
  from,
  answer,
  claim: null,
  authority,
});

// The base side is a claim owner, so the authority ladder gives every clash here
// a suggestion; `tie` builds the out-of-claim/out-of-claim pair it refuses.
const unitClash = (
  clash: UnitClash['clash'],
  questionId: string,
  target: Target,
  base: Answer,
  incoming: Answer,
): UnitClash => ({
  kind: 'unit-clash',
  clash,
  questionId,
  target,
  base: candidate('Alex', base, 'owner'),
  incoming: candidate('Jane', incoming),
});

const grainClash = (questionId: string, dimension: string, from: string): GrainClash => ({
  kind: 'grain-clash',
  clash: 'grain',
  questionId,
  dimension,
  target: { kind: 'dimension', dimension },
  rollUp: candidate(from, answered(questionId, { kind: 'dimension', dimension }, 2)),
  strata: ['chips', 'servers'].map((stratum) => {
    const target: Target = { kind: 'dimension-stratum', dimension, stratum };
    return { stratum, target: { kind: 'dimension-stratum', dimension, stratum }, candidate: candidate(from, answered(questionId, target, 0)) };
  }),
  rollUpSide: 'base',
});

const divergence = (questionId: string, target: Target, baseSeal: Seal, incomingSeal: Seal): UnitClash =>
  unitClash('divergence', questionId, target, answered(questionId, target, baseSeal), answered(questionId, target, incomingSeal));

const COMPUTE_DIV = divergence('SOV-1.dq', COMPUTE, 2, 1);
const EDGE_DIV = divergence('SOV-1.dq', EDGE, 2, 1);
const COMPUTE_GAP = unitClash('gap', 'SOV-1.dq', CHIPS, dontKnow('SOV-1.dq', CHIPS), answered('SOV-1.dq', CHIPS, 1));
const COMPUTE_SCOPE = unitClash(
  'scope',
  'SOV-1.dq',
  { kind: 'dimension-stratum', dimension: 'compute', stratum: 'servers' },
  answered('SOV-1.dq', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'servers' }, 1),
  na('SOV-1.dq', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'servers' }),
);
const INFO_DIV = divergence('SOV-1.iq', COMPUTE, 2, 4);
const GRAIN = grainClash('SOV-1.sparse', 'compute', 'Alex');

const SIX: LandingClash[] = [COMPUTE_DIV, EDGE_DIV, COMPUTE_GAP, COMPUTE_SCOPE, INFO_DIV, GRAIN];

const reauthored = (edits: Record<string, Materiality>): Workbook => {
  const copy = structuredClone(WB);
  for (const objective of copy.objectives) {
    for (const question of objective.questions) {
      const materiality = edits[question.id];
      if (materiality !== undefined) question.defaultMateriality = materiality;
    }
  }
  return copy;
};

describe('canMoveFloor', () => {
  it('gates on a material question about a critical dimension', () => {
    expect(canMoveFloor(COMPUTE_DIV, WB)).toBe(true);
    expect(canMoveFloor(EDGE_DIV, WB)).toBe(false);
    expect(canMoveFloor(divergence('SOV-1.dq', CHIPS, 2, 1), WB)).toBe(true);
  });

  it('never gates on an informational question', () => {
    expect(canMoveFloor(INFO_DIV, WB)).toBe(false);
  });

  it('gates on a material party unit', () => {
    expect(canMoveFloor(divergence('SOV-2.pq', ACME, 2, 1), WB)).toBe(true);
  });

  it('is false for a question the workbook does not carry', () => {
    expect(canMoveFloor(divergence('ZZZ.q', COMPUTE, 2, 1), WB)).toBe(false);
  });

  it('gates on a grain clash over a critical dimension', () => {
    expect(canMoveFloor(GRAIN, WB)).toBe(true);
  });
});

describe('isNonScoring', () => {
  it('reads the authored materiality', () => {
    expect(isNonScoring(INFO_DIV, WB)).toBe(true);
    expect(isNonScoring(COMPUTE_DIV, WB)).toBe(false);
    expect(isNonScoring(divergence('ZZZ.q', COMPUTE, 2, 1), WB)).toBe(false);
  });
});

describe('isOneRungApart', () => {
  it('is true for adjacent rungs of the question’s own ladder', () => {
    expect(isOneRungApart(COMPUTE_DIV, WB)).toBe(true);
    expect(isOneRungApart(divergence('SOV-1.dq', COMPUTE, 2, 4), WB)).toBe(false);
    expect(isOneRungApart(divergence('SOV-1.sparse', COMPUTE, 0, 2), WB)).toBe(true);
  });

  it('is false for every class but divergence, and for an unknown question', () => {
    expect(isOneRungApart(COMPUTE_GAP, WB)).toBe(false);
    expect(isOneRungApart(COMPUTE_SCOPE, WB)).toBe(false);
    expect(isOneRungApart(GRAIN, WB)).toBe(false);
    expect(isOneRungApart(divergence('ZZZ.q', COMPUTE, 2, 1), WB)).toBe(false);
  });
});

describe('participantsOf', () => {
  it('collects every candidate name, alphabetical', () => {
    expect(
      participantsOf([COMPUTE_DIV, unitClash('divergence', 'SOV-1.dq', EDGE, answered('SOV-1.dq', EDGE, 1), answered('SOV-1.dq', EDGE, 2)), GRAIN]),
    ).toEqual(['Alex', 'Jane']);
  });
});

// A resolution that settles COMPUTE_DIV: the choice fits a divergence's class.
const TAKE_COMPUTE: ClashResolution = {
  questionId: 'SOV-1.dq',
  target: COMPUTE,
  choice: { kind: 'take', from: 'Jane' },
  note: '',
};

describe('filterClashes', () => {
  it('shows everything under NO_FILTER, in input order', () => {
    expect(filterClashes(SIX, WB, NO_FILTER, [])).toEqual(SIX);
  });

  it('narrows by class', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, clashClass: 'divergence' }, [])).toEqual([
      COMPUTE_DIV,
      EDGE_DIV,
      INFO_DIV,
    ]);
  });

  it('narrows to floor movers', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, floorMoversOnly: true }, [])).toEqual([
      COMPUTE_DIV,
      COMPUTE_GAP,
      COMPUTE_SCOPE,
      GRAIN,
    ]);
  });

  it('hides informational clashes', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, hideNonScoring: true }, [])).toHaveLength(5);
  });

  it('hides na clashes too, and keeps ranking ones', () => {
    const wb = reauthored({ 'SOV-1.sparse': 'na', 'SOV-2.pq': 'ranking' });
    const RANK_DIV = divergence('SOV-2.pq', ACME, 2, 1);
    const shown = filterClashes([...SIX, RANK_DIV], wb, { ...NO_FILTER, hideNonScoring: true }, []);
    expect(shown).not.toContain(GRAIN);
    expect(shown).toContain(RANK_DIV);
  });

  it('narrows to one-rung divergences', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, oneRungOnly: true }, [])).toEqual([COMPUTE_DIV, EDGE_DIV]);
    expect(filterClashes(SIX, WB, { ...NO_FILTER, oneRungOnly: true, clashClass: 'gap' }, [])).toEqual([]);
  });

  it('narrows by participant', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, participant: 'Jane' }, [])).toEqual([
      COMPUTE_DIV,
      EDGE_DIV,
      COMPUTE_GAP,
      COMPUTE_SCOPE,
      INFO_DIV,
    ]);
  });

  it('hides and shows the decided ones', () => {
    expect(filterClashes(SIX, WB, { ...NO_FILTER, status: 'decided' }, [TAKE_COMPUTE])).toEqual([
      COMPUTE_DIV,
    ]);
    expect(filterClashes(SIX, WB, { ...NO_FILTER, status: 'open' }, [TAKE_COMPUTE])).toEqual([
      EDGE_DIV,
      COMPUTE_GAP,
      COMPUTE_SCOPE,
      INFO_DIV,
      GRAIN,
    ]);
    // With nothing decided, `open` is the whole queue and `decided` is empty.
    expect(filterClashes(SIX, WB, { ...NO_FILTER, status: 'open' }, [])).toEqual(SIX);
    expect(filterClashes(SIX, WB, { ...NO_FILTER, status: 'decided' }, [])).toEqual([]);
  });

  it('counts a resolution whose choice misfits the class as undecided', () => {
    const misfit: ClashResolution = { ...TAKE_COMPUTE, choice: { kind: 'grain', keep: 'strata' } };
    expect(filterClashes(SIX, WB, { ...NO_FILTER, status: 'decided' }, [misfit])).toEqual([]);
  });

  it('applies two switches as a conjunction', () => {
    expect(
      filterClashes(SIX, WB, { ...NO_FILTER, clashClass: 'divergence', floorMoversOnly: true }, []),
    ).toEqual([COMPUTE_DIV]);
  });
});

describe('isDecided', () => {
  it('is the same test the queue and the groups apply', () => {
    expect(isDecided(COMPUTE_DIV, [TAKE_COMPUTE])).toBe(true);
    expect(isDecided(EDGE_DIV, [TAKE_COMPUTE])).toBe(false);
    expect(isDecided(COMPUTE_DIV, [])).toBe(false);
  });
});

describe('isQueueNarrowed', () => {
  it('is false only for NO_FILTER', () => {
    expect(isQueueNarrowed(NO_FILTER)).toBe(false);
    expect(isQueueNarrowed({ ...NO_FILTER, status: 'open' })).toBe(true);
    expect(isQueueNarrowed({ ...NO_FILTER, participant: 'Jane' })).toBe(true);
    expect(isQueueNarrowed({ ...NO_FILTER, hideNonScoring: true })).toBe(true);
  });
});

describe('toggleSwitch', () => {
  it('flips one field and leaves the rest alone', () => {
    expect(toggleSwitch(NO_FILTER, 'oneRungOnly')).toEqual({ ...NO_FILTER, oneRungOnly: true });
    expect(toggleSwitch({ ...NO_FILTER, oneRungOnly: true }, 'oneRungOnly')).toEqual(NO_FILTER);
    expect(toggleSwitch({ ...NO_FILTER, oneRungOnly: true }, 'floorMoversOnly')).toEqual({
      ...NO_FILTER,
      oneRungOnly: true,
      floorMoversOnly: true,
    });
  });
});

describe('queueGroups', () => {
  const PQ = divergence('SOV-2.pq', ACME, 2, 1);
  const IN_ORDER: LandingClash[] = [PQ, COMPUTE_DIV, EDGE_DIV];

  it('groups by objective in workbook order, keeping input order inside a group', () => {
    const groups = queueGroups(IN_ORDER, WB, []);
    expect(groups.map((g) => g.objectiveId)).toEqual(['SOV-1', 'SOV-2']);
    expect(groups.map((g) => g.name)).toEqual(['Tech', 'Legal']);
    expect(groups[0].clashes).toEqual([COMPUTE_DIV, EDGE_DIV]);
    expect(groups[1].clashes).toEqual([PQ]);
    expect(groups.map((g) => g.decided)).toEqual([0, 0]);
  });

  it('counts a decided clash only when the choice fits its class', () => {
    const take: ClashResolution = {
      questionId: 'SOV-1.dq',
      target: COMPUTE,
      choice: { kind: 'take', from: 'Jane' },
      note: '',
    };
    const decided = queueGroups(IN_ORDER, WB, [take]);
    expect(decided[0].decided).toBe(1);
    expect(decided[1].decided).toBe(0);

    const misfit: ClashResolution = { ...take, choice: { kind: 'grain', keep: 'strata' } };
    expect(queueGroups(IN_ORDER, WB, [misfit])[0].decided).toBe(0);
  });

  it('never drops a clash on a question the workbook does not carry', () => {
    const orphan = divergence('ZZZ.q', COMPUTE, 2, 1);
    const groups = queueGroups([...IN_ORDER, orphan], WB, []);
    expect(groups[groups.length - 1]).toEqual({
      objectiveId: 'unknown',
      name: 'Unknown objective',
      clashes: [orphan],
      decided: 0,
    });
    expect(groups.reduce((n, g) => n + g.clashes.length, 0)).toBe(4);
  });

  it('is empty for no clashes', () => {
    expect(queueGroups([], WB, [])).toEqual([]);
  });
});

describe('queueFacets', () => {
  it('counts every option against the unnarrowed queue', () => {
    const facets = queueFacets(SIX, WB, NO_FILTER, []);
    expect(facets).toMatchObject({ shown: 6, total: 6 });
    expect(facets.classes).toEqual([
      { value: 'all', label: 'All', count: 6 },
      { value: 'divergence', label: 'Divergence', count: 3 },
      { value: 'gap', label: 'Gap', count: 1 },
      { value: 'scope', label: 'Scope', count: 1 },
      { value: 'grain', label: 'Grain', count: 1 },
    ]);
    expect(facets.participants).toEqual([
      { value: null, label: 'Anyone', count: 6 },
      { value: 'Alex', label: 'Alex', count: 6 },
      { value: 'Jane', label: 'Jane', count: 5 },
    ]);
    expect(facets.switches).toEqual([
      { value: 'floorMoversOnly', label: 'Can move the floor', count: 4, on: false },
      { value: 'hideNonScoring', label: 'Hide non-scoring', count: 5, on: false },
      { value: 'oneRungOnly', label: 'One rung apart', count: 2, on: false },
    ]);
  });

  it('tracks open against decided — the queue’s own progress', () => {
    expect(queueFacets(SIX, WB, NO_FILTER, []).statuses).toEqual([
      { value: 'all', label: 'All', count: 6 },
      { value: 'open', label: 'Open', count: 6 },
      { value: 'decided', label: 'Decided', count: 0 },
    ]);
    expect(queueFacets(SIX, WB, NO_FILTER, [TAKE_COMPUTE]).statuses).toEqual([
      { value: 'all', label: 'All', count: 6 },
      { value: 'open', label: 'Open', count: 5 },
      { value: 'decided', label: 'Decided', count: 1 },
    ]);
  });

  it('holds every OTHER narrowing when counting an option, and `on` reads the filter', () => {
    const facets = queueFacets(
      SIX,
      WB,
      { ...NO_FILTER, clashClass: 'divergence', hideNonScoring: true },
      [],
    );
    // Within the divergences, minus the informational one: 2 shown.
    expect(facets.shown).toBe(2);
    // The class counts are all taken with `hideNonScoring` still on.
    expect(facets.classes.map((entry) => entry.count)).toEqual([5, 2, 1, 1, 1]);
    expect(facets.switches).toEqual([
      { value: 'floorMoversOnly', label: 'Can move the floor', count: 1, on: false },
      { value: 'hideNonScoring', label: 'Hide non-scoring', count: 2, on: true },
      { value: 'oneRungOnly', label: 'One rung apart', count: 2, on: false },
    ]);
  });

  it('offers Anyone plus one option per candidate, even with no clashes', () => {
    expect(queueFacets([], WB, NO_FILTER, [])).toMatchObject({
      shown: 0,
      total: 0,
      participants: [{ value: null, label: 'Anyone', count: 0 }],
    });
  });
});

describe('filterSummary', () => {
  it('says the queue is whole when nothing narrows it', () => {
    expect(filterSummary(NO_FILTER, 35, 35)).toBe('Showing all 35 clashes.');
    expect(filterSummary(NO_FILTER, 1, 1)).toBe('Showing all 1 clash.');
  });

  it('spells out each narrowing in one sentence', () => {
    expect(filterSummary({ ...NO_FILTER, status: 'open' }, 23, 35)).toBe(
      'Showing 23 of 35 — open clashes.',
    );
    expect(filterSummary({ ...NO_FILTER, status: 'decided', clashClass: 'gap' }, 1, 35)).toBe(
      'Showing 1 of 35 — decided gap clash.',
    );
    expect(filterSummary({ ...NO_FILTER, participant: 'Jane' }, 20, 35)).toBe(
      'Showing 20 of 35 — clashes Jane is party to.',
    );
    expect(filterSummary({ ...NO_FILTER, hideNonScoring: true }, 33, 35)).toBe(
      'Showing 33 of 35 — clashes. Non-scoring clashes are hidden.',
    );
  });

  it('joins several narrowings in the order the bar reads', () => {
    expect(
      filterSummary(
        {
          clashClass: 'divergence',
          participant: 'Jane',
          status: 'open',
          floorMoversOnly: true,
          hideNonScoring: true,
          oneRungOnly: true,
        },
        9,
        35,
      ),
    ).toBe(
      'Showing 9 of 35 — open divergence clashes Jane is party to, on units that can move the estate floor, one rung apart. Non-scoring clashes are hidden.',
    );
  });
});

describe('optionName', () => {
  it('names an option by what it selects and what it would leave', () => {
    expect(optionName('Decided', 12)).toBe('Decided — 12 clashes');
    expect(optionName('Grain', 1)).toBe('Grain — 1 clash');
    expect(optionName('One rung apart', 0)).toBe('One rung apart — 0 clashes');
  });
});

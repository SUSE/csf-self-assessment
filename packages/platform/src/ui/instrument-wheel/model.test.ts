import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Party, Workbook } from '../../schema';
import { answerFor } from '../../assessment';
import { inspectChip, instrumentModel, instrumentSeals } from './model';
import { READING_IDS, instrumentReadings, readingInspection } from './readings';
import { csfWorkbookRaw, euCsfCalculatorWorkbookRaw } from '../../test-fixtures';

const WB = WorkbookSchema.parse(csfWorkbookRaw);

function chip(model: ReturnType<typeof instrumentModel>, kind: string, key: string) {
  const found = model.chips.find((c) => c.kind === kind && c.key === key);
  if (!found) throw new Error(`no chip ${kind}:${key}`);
  return found;
}

// A minimal valid workbook exercising the gap/empty/unused paths the sample has
// none of: an uncovered dimension, a split dimension, an unused role.
const MINIMAL: Workbook = WorkbookSchema.parse({
  meta: { id: 't', version: '1', title: 'T' },
  sealLevels: [{ seal: 0, name: 'n', description: 'd' }],
  dimensions: [
    { id: 'a', name: 'A', critical: true, strata: ['x', 'y'] },
    { id: 'b', name: 'B' },
  ],
  roles: [
    // A display name unlike its key, so a rail showing the key instead fails here.
    { id: 'R1', name: 'Architecture' },
    { id: 'R2', name: 'R2' },
  ],
  parties: [
    { id: 'me', name: 'Me', kind: 'assessed' },
    { id: 'tp', name: 'TP', kind: 'third-party' },
  ],
  objectives: [
    {
      id: 'O1',
      name: 'O1',
      weight: 100,
      questions: [
        { id: 'q1', grain: 'dimension', appliesTo: ['a'], text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [{ id: 'choice-1', description: 'd', points: 0, seal: 0 }] },
        { id: 'q2', grain: 'party', axis: 'party', text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [{ id: 'choice-1', description: 'd', points: 0, seal: 0 }] },
        { id: 'q3', grain: 'party', axis: 'assessment', text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [{ id: 'choice-1', description: 'd', points: 0, seal: 0 }] },
      ],
    },
  ],
});

describe('instrumentModel chips', () => {
  it('gives every authored dimension a spoke, in workbook order', () => {
    const model = instrumentModel(WB);
    const dimensionKeys = model.chips.filter((c) => c.kind === 'dimension').map((c) => c.key);
    expect(dimensionKeys).toEqual(WB.dimensions.map((d) => d.id));
  });

  it('gives every party TYPE a spoke and the estate a single assessment chip', () => {
    const model = instrumentModel(WB);
    expect(model.chips.filter((c) => c.kind === 'party').map((c) => c.key)).toEqual(
      WB.parties.map((p) => p.id),
    );
    expect(model.chips.filter((c) => c.kind === 'assessment').length).toBe(1);
  });

  it('sizes a dimension spoke by the question-units that fan onto it', () => {
    const model = instrumentModel(WB);
    // compute is the busiest dimension in the sample.
    expect(chip(model, 'dimension', 'compute').count).toBe(10);
    expect(chip(model, 'dimension', 'platform').count).toBe(8);
    expect(chip(model, 'dimension', 'facilities').count).toBe(1);
  });

  it('sizes the assessment chip by the asked-once questions, and shows the count', () => {
    // Six party-grain questions ride the assessment axis in the sample.
    const assessment = chip(instrumentModel(WB), 'assessment', 'assessment');
    expect(assessment.count).toBe(6);
    expect(assessment.sub).toContain('6 questions');
  });

  it('gives every party type the same per-party question load, shown on the spoke', () => {
    const model = instrumentModel(WB);
    // Twelve party-axis questions — every concrete party answers all of them,
    // whatever its type, so the arc is the taxonomy not a per-type count. The
    // count still rides each spoke's sub-line, like a dimension's does.
    for (const c of model.chips.filter((c) => c.kind === 'party')) {
      expect(c.count).toBe(12);
      expect(c.sub).toContain('12 questions');
    }
  });

  it('emphasises critical dimensions, the assessed party, and the estate', () => {
    const model = instrumentModel(WB);
    expect(chip(model, 'dimension', 'compute').emphasis).toBe(true); // critical
    expect(chip(model, 'dimension', 'edge').emphasis).toBe(false); // scores only
    expect(chip(model, 'party', 'institution').emphasis).toBe(true); // assessed
    expect(chip(model, 'party', 'primary-provider').emphasis).toBe(false);
    expect(chip(model, 'assessment', 'assessment').emphasis).toBe(true);
  });

  it('carries each dimension its stratum count', () => {
    const model = instrumentModel(WB);
    expect(chip(model, 'dimension', 'compute').strata).toBe(4);
    expect(chip(model, 'dimension', 'network').strata).toBe(0);
  });

  it('reports the busiest spoke and the total fan-out', () => {
    const model = instrumentModel(WB);
    expect(model.maxCount).toBe(12); // a party type's load
    // 6 assessment + 38 dimension-units + 4 types × 12 party-axis = 92.
    expect(model.totalUnits).toBe(92);
  });

  it('flags a dimension no question reaches as an empty spoke', () => {
    const model = instrumentModel(MINIMAL);
    expect(chip(model, 'dimension', 'a').empty).toBe(false);
    const b = chip(model, 'dimension', 'b');
    expect(b.count).toBe(0);
    expect(b.empty).toBe(true);
  });
});

describe('instrumentModel stats', () => {
  it('tallies the sample instrument from the definition alone', () => {
    const { stats } = instrumentModel(WB);
    expect(stats.objectives).toBe(8);
    expect(stats.weightSum).toBe(100);
    expect(stats.questions).toBe(39);
    expect(stats.partyGrain).toBe(18);
    expect(stats.dimensionGrain).toBe(21);
    expect(stats.dimensions).toBe(10);
    expect(stats.criticalDimensions).toBe(6);
    expect(stats.uncoveredDimensions).toBe(0);
    expect(stats.strata).toBe(8);
    expect(stats.splitDimensions).toBe(2);
    expect(stats.partyTypes).toBe(4);
    expect(stats.thirdPartyTypes).toBe(3);
    expect(stats.roles).toBe(6);
    expect(stats.testEstates).toBe(3);
  });

  it('surfaces the gaps a workbook still carries — uncovered dimensions, unused roles', () => {
    const { stats } = instrumentModel(MINIMAL);
    expect(stats.uncoveredDimensions).toBe(1); // b
    expect(stats.unusedRoles).toBe(1); // R2
    expect(stats.splitDimensions).toBe(1); // a
    expect(stats.strata).toBe(2);
    expect(stats.thirdPartyTypes).toBe(1);
  });
});

describe('inspectChip', () => {
  it('reads a dimension chip as its dimension-grain questions, grouped by SOV', () => {
    const insp = inspectChip(MINIMAL, { chipKind: 'dimension', key: 'a' });
    expect(insp).not.toBeNull();
    expect(insp?.name).toBe('A');
    expect(insp?.kindLabel).toContain('critical');
    expect(insp?.kindLabel).toContain('2 strata');
    expect(insp?.section).toBe('dimensions');
    expect(insp?.total).toBe(1);
    expect(insp?.groups).toEqual([
      {
        objectiveId: 'O1',
        objectiveName: 'O1',
        questions: [{ id: 'q1', text: 't', role: 'R1', roleName: 'Architecture' }],
      },
    ]);
  });

  it('returns a valid, empty inspection for a dimension no question reaches', () => {
    const insp = inspectChip(MINIMAL, { chipKind: 'dimension', key: 'b' });
    expect(insp).not.toBeNull();
    expect(insp?.name).toBe('B');
    expect(insp?.total).toBe(0);
    expect(insp?.groups).toEqual([]);
  });

  it('reads a party chip as the party-axis questions (every type carries them all)', () => {
    const assessed = inspectChip(MINIMAL, { chipKind: 'party', key: 'me' });
    const third = inspectChip(MINIMAL, { chipKind: 'party', key: 'tp' });
    expect(assessed?.name).toBe('Me');
    expect(assessed?.kindLabel).toContain('assessed party');
    expect(assessed?.section).toBe('parties');
    expect(assessed?.total).toBe(1);
    expect(assessed?.groups[0].questions).toEqual([
      { id: 'q2', text: 't', role: 'R1', roleName: 'Architecture' },
    ]);
    // The arc is the taxonomy: a third-party type carries the same party-axis load.
    expect(third?.kindLabel).toContain('third party');
    expect(third?.total).toBe(1);
    expect(third?.groups[0].questions.map((q) => q.id)).toEqual(['q2']);
  });

  it('reads the assessment chip as the asked-once questions', () => {
    const insp = inspectChip(MINIMAL, { chipKind: 'assessment', key: 'assessment' });
    expect(insp?.name).toBe('Whole estate');
    expect(insp?.section).toBe('objectives');
    expect(insp?.total).toBe(1);
    expect(insp?.groups[0].questions.map((q) => q.id)).toEqual(['q3']);
  });

  it('returns null when the chip no longer exists (a removed dimension/party)', () => {
    expect(inspectChip(MINIMAL, { chipKind: 'dimension', key: 'gone' })).toBeNull();
    expect(inspectChip(MINIMAL, { chipKind: 'party', key: 'gone' })).toBeNull();
  });

  it('totals agree with the wheel chip counts, and only covered SOVs appear in order', () => {
    const model = instrumentModel(WB);
    for (const key of ['compute', 'platform', 'facilities']) {
      const insp = inspectChip(WB, { chipKind: 'dimension', key });
      expect(insp?.total).toBe(chip(model, 'dimension', key).count);
      // every listed question genuinely applies to this dimension...
      const dimQuestions = WB.objectives.flatMap((o) =>
        o.questions.filter((q) => q.grain === 'dimension' && q.appliesTo.includes(key)),
      );
      expect(insp?.total).toBe(dimQuestions.length);
      // ...and the groups are a subsequence of the workbook's objective order.
      const order = insp!.groups.map((g) => g.objectiveId);
      const wbOrder = WB.objectives.map((o) => o.id).filter((id) => order.includes(id));
      expect(order).toEqual(wbOrder);
    }
    expect(inspectChip(WB, { chipKind: 'assessment', key: 'assessment' })?.total).toBe(
      chip(model, 'assessment', 'assessment').count,
    );
  });
});

// A small instrument with a split critical dimension, a plain dimension, and both
// party axes — enough to exercise the four roll-ups instrumentSeals performs.
const G = { groupId: 'g1', placement: 'individual' as const };
const SEALED: Workbook = WorkbookSchema.parse({
  meta: { id: 's', version: '1', title: 'S' },
  sealLevels: [0, 1, 2, 3, 4].map((seal) => ({ seal, name: `S${seal}`, description: 'd' })),
  roles: [{ id: 'R1', name: 'R1' }],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'provider', name: 'Provider', kind: 'third-party' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true, strata: ['a', 'b'] },
    { id: 'network', name: 'Network' },
  ],
  objectives: [
    {
      id: 'O1',
      name: 'O1',
      weight: 100,
      questions: [
        { id: 'd1', grain: 'dimension', appliesTo: ['compute', 'network'], text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: 'd', points: seal * 25, seal })) },
        { id: 'p1', grain: 'party', axis: 'party', text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: 'd', points: seal * 25, seal })) },
        { id: 'a1', grain: 'party', axis: 'assessment', text: 't', why: 'w', role: 'R1', defaultMateriality: 'material', ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: 'd', points: seal * 25, seal })) },
      ],
    },
  ],
});
// Two concrete providers share one party TYPE, so their party-axis answers must
// roll up to a single `party:provider` chip.
const CONCRETE: Party[] = [
  { id: 'inst1', name: 'Inst', type: 'institution', serves: [] },
  { id: 'prov1', name: 'P1', type: 'provider', serves: ['compute'] },
  { id: 'prov2', name: 'P2', type: 'provider', serves: ['network'] },
];

describe('instrumentSeals', () => {
  it('counts one question-unit per chip and takes its lowest answered seal, folding strata in', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'a' }, { state: 'answered', rungId: 'choice-4' }, G),
      answerFor('d1', { kind: 'dimension-stratum', dimension: 'compute', stratum: 'b' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-5' }, G),
    ];
    const seals = instrumentSeals(SEALED, CONCRETE, answers);
    // The split dimension is ONE question-unit on the wheel (not two strata); its
    // seal is the lower of the strata, covered because every stratum is answered.
    expect(seals.get('dimension:compute')).toEqual({ total: 1, covered: 1, seal: 1 });
    expect(seals.get('dimension:network')).toEqual({ total: 1, covered: 1, seal: 4 });
  });

  it('rolls party-axis answers up to the answering party’s TYPE, counted once per type', () => {
    const answers = [
      answerFor('p1', { kind: 'party', party: 'inst1' }, { state: 'answered', rungId: 'choice-3' }, G),
      answerFor('p1', { kind: 'party', party: 'prov1' }, { state: 'answered', rungId: 'choice-4' }, G),
      answerFor('p1', { kind: 'party', party: 'prov2' }, { state: 'answered', rungId: 'choice-2' }, G),
    ];
    const seals = instrumentSeals(SEALED, CONCRETE, answers);
    // both providers collapse to one chip counted once; its seal is the lower.
    expect(seals.get('party:provider')).toEqual({ total: 1, covered: 1, seal: 1 });
    expect(seals.get('party:institution')).toEqual({ total: 1, covered: 1, seal: 2 });
  });

  it('lands assessment-axis answers on the single estate chip', () => {
    const answers = [answerFor('a1', { kind: 'assessment' }, { state: 'answered', rungId: 'choice-3' }, G)];
    expect(instrumentSeals(SEALED, CONCRETE, answers).get('assessment:assessment')).toEqual({
      total: 1,
      covered: 1,
      seal: 2,
    });
  });

  it('covers a chip only when EVERY underlying unit is recorded, but shows the seal of any that are', () => {
    // Only one of the two providers has answered the party-axis question: the chip
    // is not fully covered, yet its worst answered seal still surfaces.
    const answers = [answerFor('p1', { kind: 'party', party: 'prov1' }, { state: 'answered', rungId: 'choice-4' }, G)];
    expect(instrumentSeals(SEALED, CONCRETE, answers).get('party:provider')).toEqual({
      total: 1,
      covered: 0,
      seal: 3,
    });
  });

  it('leaves an in-scope chip with no answered unit at seal null', () => {
    // Answer compute only; network is still in scope (d1 covers it) but untouched.
    const answers = [answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-3' }, G)];
    const network = instrumentSeals(SEALED, CONCRETE, answers).get('dimension:network');
    expect(network).toEqual({ total: 1, covered: 0, seal: null });
  });

  it('counts a recorded don’t-know as covered but not as a seal', () => {
    const answers = [answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'dont-know' }, G)];
    expect(instrumentSeals(SEALED, CONCRETE, answers).get('dimension:compute')).toEqual({
      total: 1,
      covered: 1,
      seal: null,
    });
  });

  it('reads every chip as unanswered when the assessment carries nothing', () => {
    const seals = instrumentSeals(SEALED, CONCRETE, []);
    for (const cs of seals.values()) {
      expect(cs.covered).toBe(0);
      expect(cs.seal).toBeNull();
      expect(cs.total).toBeGreaterThan(0);
    }
  });

  it('totals reconcile with the wheel — Σ total equals instrumentModel.totalUnits', () => {
    // Every party type has a concrete member, so the seal roll-up counts the same
    // fan-out the structural wheel sizes by. This is what lets the overview report
    // coverage against `totalUnits` without the two numbers disagreeing.
    const total = [...instrumentSeals(SEALED, CONCRETE, []).values()].reduce((sum, cs) => sum + cs.total, 0);
    expect(total).toBe(instrumentModel(SEALED).totalUnits);
  });
});

// instrument-S5: the imported EC calculator declares no dimensions, so the wheel
// must fabricate no dimension arc and must report the zeroes honestly.
describe('instrumentModel over the EC calculator (instrument-S5)', () => {
  const EC = WorkbookSchema.parse(euCsfCalculatorWorkbookRaw);
  const model = instrumentModel(EC);

  it('draws the assessment and party arcs only', () => {
    expect(model.chips.map((c) => c.kind)).toEqual(['assessment', 'party']);
    expect(model.chips[0].count).toBe(48);
    expect(model.chips[0].empty).toBe(false);
    expect(model.chips[1].count).toBe(0);
    expect(model.chips[1].empty).toBe(true);
    expect(model.maxCount).toBe(48);
    expect(model.totalUnits).toBe(48);
  });

  it('reports the instrument stats honestly', () => {
    expect(model.stats).toMatchObject({
      dimensions: 0,
      criticalDimensions: 0,
      uncoveredDimensions: 0,
      strata: 0,
      splitDimensions: 0,
      dimensionGrain: 0,
      partyGrain: 48,
      objectives: 8,
      weightSum: 100,
      roles: 1,
      unusedRoles: 0,
      partyTypes: 1,
      thirdPartyTypes: 0,
      testEstates: 2,
    });
  });
});

// The readings registry: one entry per id carries the row AND its detail, so both
// are read here through the two lookups the rails call.
describe('instrument readings', () => {
  it('projects one row per reading id, in ledger order', () => {
    expect(instrumentReadings(instrumentModel(WB).stats).map((r) => r.id)).toEqual([
      ...READING_IDS,
    ]);
  });

  it('gives every reading a detail whose row agrees with the ledger', () => {
    const rows = instrumentReadings(instrumentModel(WB).stats);
    for (const id of READING_IDS) {
      const insp = readingInspection(WB, id);
      const row = rows.find((r) => r.id === id);
      expect(insp, id).not.toBeNull();
      expect(insp?.lead.length, id).toBeGreaterThan(0);
      expect(insp?.empty.length, id).toBeGreaterThan(0);
      // Row and detail cannot drift: the same entry produced both.
      expect({ ...insp, lead: undefined, items: undefined, groups: undefined, empty: undefined })
        .toMatchObject({ ...row });
    }
  });

  it('names what was counted, one item per counted thing', () => {
    expect(readingInspection(WB, 'objectives')?.items).toHaveLength(WB.objectives.length);
    expect(readingInspection(WB, 'dimensions')?.items).toHaveLength(WB.dimensions.length);
    expect(readingInspection(WB, 'strata')?.items).toHaveLength(WB.dimensions.length);
    expect(readingInspection(WB, 'party-types')?.items).toHaveLength(WB.parties.length);
    expect(readingInspection(WB, 'roles')?.items).toHaveLength(WB.roles.length);
    expect(readingInspection(WB, 'test-estates')?.items).toHaveLength(WB.testEstates.length);
    expect(readingInspection(WB, 'answer-units')?.items).toHaveLength(
      instrumentModel(WB).chips.length,
    );
  });

  it('reads the questions reading as groups, not a flat list', () => {
    const insp = readingInspection(MINIMAL, 'questions');
    expect(insp?.items).toEqual([]);
    expect(insp?.groups.flatMap((g) => g.blocks.map((b) => b.questionId))).toEqual([
      'q1',
      'q2',
      'q3',
    ]);
    // The role chip shows the role's NAME, not its key.
    expect(insp?.groups[0].blocks[0].chips).toContain('Architecture');
  });

  it('carries the row gaps into the detail — the uncovered dimension is named', () => {
    const insp = readingInspection(MINIMAL, 'dimensions');
    expect(insp?.tone).toBe('gap');
    expect(insp?.items).toEqual([
      { name: 'A', note: 'critical', tone: undefined },
      { name: 'B', note: 'no question reaches it', tone: 'gap' },
    ]);
  });

  it('advises on the role nobody uses, by name', () => {
    const insp = readingInspection(MINIMAL, 'roles');
    expect(insp?.tone).toBe('advise');
    expect(insp?.items.map((i) => [i.name, i.tone])).toEqual([
      ['Architecture', undefined],
      ['R2', 'advise'],
    ]);
  });

  it('reads strata per dimension, split or whole', () => {
    expect(readingInspection(MINIMAL, 'strata')?.items).toEqual([
      { name: 'A', note: 'x · y' },
      { name: 'B', note: 'no split' },
    ]);
  });

  it('separates the assessed party from the third parties', () => {
    expect(readingInspection(MINIMAL, 'party-types')?.items).toEqual([
      { name: 'Me', note: 'assessed party' },
      { name: 'TP', note: 'third party' },
    ]);
  });

  it('reads answer units on the axis they fan onto, flagging an empty axis', () => {
    const insp = readingInspection(MINIMAL, 'answer-units');
    expect(insp?.items.filter((i) => i.tone === 'gap').map((i) => i.name)).toEqual(['B']);
  });

  it('says so when there is no test estate yet', () => {
    const insp = readingInspection(MINIMAL, 'test-estates');
    expect(insp?.value).toBe('0');
    expect(insp?.items).toEqual([]);
    expect(insp?.empty).toContain('No test estate yet');
  });
});

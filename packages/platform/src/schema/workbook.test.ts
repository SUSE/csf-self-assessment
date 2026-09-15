import { describe, expect, it } from 'vitest';
import { DraftWorkbookSchema, WorkbookSchema } from './index';
import { BASE, DIM, DIM_Q, PARTIES, ROLES, messagesOf } from './fixtures';

describe('WorkbookSchema', () => {
  it('parses a valid minimal workbook', () => {
    const parsed = WorkbookSchema.parse(BASE);
    expect(parsed.objectives[0].questions[0].id).toBe('SOV-2.q1');
    expect(parsed.objectives[0].weight).toBe(100);
    expect(parsed.objectives[0].questions[0].ladder.length).toBe(3);
  });

  it('defaults dimensions to [] when absent (entity-only workbook)', () => {
    expect(WorkbookSchema.parse(BASE).dimensions).toEqual([]);
  });

  it('parses dimensions and a dimension-grain question', () => {
    const parsed = WorkbookSchema.parse({
      ...BASE,
      dimensions: [DIM],
      objectives: [{ ...BASE.objectives[0], questions: [BASE.objectives[0].questions[0], DIM_Q] }],
    });
    expect(parsed.dimensions.map((d) => d.id)).toEqual(['compute']);
    const dq = parsed.objectives[0].questions.find((q) => q.id === 'SOV-2.d1');
    expect(dq?.grain).toBe('dimension');
    if (dq?.grain === 'dimension') expect(dq.appliesTo).toEqual(['compute']);
  });

  it('carries a firm critical flag; unmarked defaults false, no defaultDeclared (SCHEMA-1)', () => {
    const parsed = WorkbookSchema.parse({
      ...BASE,
      dimensions: [DIM, { id: 'edge', name: 'Edge' }],
    });
    const compute = parsed.dimensions.find((d) => d.id === 'compute');
    const edge = parsed.dimensions.find((d) => d.id === 'edge');
    expect(compute?.critical).toBe(true);
    expect(edge?.critical).toBe(false);
    expect('defaultDeclared' in (compute ?? {})).toBe(false);
    expect('defaultDeclared' in (edge ?? {})).toBe(false);
  });

  it('rejects weights that do not sum to 100', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].weight = 90;
    expect(WorkbookSchema.safeParse(clone).success).toBe(false);
  });

  it('rejects duplicate question ids', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions.push(structuredClone(clone.objectives[0].questions[0]));
    expect(WorkbookSchema.safeParse(clone).success).toBe(false);
  });

  it('R5 allows a repeated SEAL', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder = [
      { id: 'choice-1', description: 'a', points: 0, seal: 4 },
      { id: 'choice-2', description: 'b', points: 100, seal: 4 },
    ];
    expect(WorkbookSchema.safeParse(clone).success).toBe(true);
  });

  it('R5 rejects a repeated rung id', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder = [
      { id: 'choice-1', description: 'a', points: 0, seal: 0 },
      { id: 'choice-1', description: 'b', points: 100, seal: 4 },
    ];
    expect(messagesOf(WorkbookSchema.safeParse(clone))).toContain(
      'Ladder for SOV-2.q1 repeats a rung id; every rung id must be unique within its question.',
    );
  });

  it('R22 rejects falling points', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder = [
      { id: 'choice-1', description: 'a', points: 100, seal: 1 },
      { id: 'choice-2', description: 'b', points: 0, seal: 4 },
    ];
    expect(messagesOf(WorkbookSchema.safeParse(clone))).toContain(
      'Ladder for SOV-2.q1 drops in points at rung 2; going up a ladder, points never fall.',
    );
  });

  it('R23 rejects a falling SEAL', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder = [
      { id: 'choice-1', description: 'a', points: 0, seal: 4 },
      { id: 'choice-2', description: 'b', points: 100, seal: 1 },
    ];
    expect(messagesOf(WorkbookSchema.safeParse(clone))).toContain(
      'Ladder for SOV-2.q1 drops in SEAL at rung 2; going up a ladder, SEAL never falls.',
    );
  });

  it('R22 and R23 allow ties', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder = [
      { id: 'choice-1', description: 'a', points: 50, seal: 2 },
      { id: 'choice-2', description: 'b', points: 50, seal: 2 },
    ];
    expect(WorkbookSchema.safeParse(clone).success).toBe(true);
  });

  it('rejects a rung SEAL not defined in sealLevels', () => {
    const clone = structuredClone(BASE);
    clone.sealLevels = clone.sealLevels.filter((l) => l.seal !== 4);
    expect(WorkbookSchema.safeParse(clone).success).toBe(false);
  });

  it('rejects a seal outside 0..4', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].ladder[0].seal = 5;
    expect(WorkbookSchema.safeParse(clone).success).toBe(false);
  });

  it('rejects an unknown role', () => {
    const clone = structuredClone(BASE);
    clone.objectives[0].questions[0].role = 'XYZ';
    expect(WorkbookSchema.safeParse(clone).success).toBe(false);
  });

  it('parses roles beside dimensions, in order', () => {
    expect(WorkbookSchema.parse({ ...BASE, roles: ROLES }).roles.map((r) => r.id)).toEqual([
      'ARCH',
      'OPS',
      'SEC',
      'LEG',
      'PROC',
      'FAC',
    ]);
  });

  it('rejects duplicate role ids (R13)', () => {
    expect(
      WorkbookSchema.safeParse({
        ...BASE,
        roles: [
          { id: 'LEG', name: 'Legal' },
          { id: 'LEG', name: 'Legal 2' },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects a dimension-grain question whose appliesTo names an undeclared dimension (R6)', () => {
    expect(
      WorkbookSchema.safeParse({
        ...BASE,
        dimensions: [DIM],
        objectives: [{ ...BASE.objectives[0], questions: [{ ...DIM_Q, appliesTo: ['compute', 'ghost'] }] }],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate dimension ids (R7)', () => {
    expect(WorkbookSchema.safeParse({ ...BASE, dimensions: [DIM, { ...DIM, name: 'Compute 2' }] }).success).toBe(
      false,
    );
  });

  it('rejects empty objectives / questions / ladder / strings', () => {
    expect(WorkbookSchema.safeParse({ ...BASE, objectives: [] }).success).toBe(false);

    const noQuestions = structuredClone(BASE);
    noQuestions.objectives[0].questions = [];
    expect(WorkbookSchema.safeParse(noQuestions).success).toBe(false);

    const noLadder = structuredClone(BASE);
    noLadder.objectives[0].questions[0].ladder = [];
    expect(WorkbookSchema.safeParse(noLadder).success).toBe(false);

    const emptyId = structuredClone(BASE);
    emptyId.meta.id = '';
    expect(WorkbookSchema.safeParse(emptyId).success).toBe(false);
  });
});

describe('party types on the workbook', () => {
  it('rejects a workbook with zero assessed party types (R16)', () => {
    expect(
      WorkbookSchema.safeParse({ ...BASE, parties: PARTIES.map((p) => ({ ...p, kind: 'third-party' })) }).success,
    ).toBe(false);
  });

  it('rejects a workbook with two assessed party types (R16)', () => {
    expect(
      WorkbookSchema.safeParse({ ...BASE, parties: [...PARTIES, { id: 'inst2', name: 'Inst 2', kind: 'assessed' }] })
        .success,
    ).toBe(false);
  });

  it('rejects duplicate party-type ids (R15)', () => {
    expect(
      WorkbookSchema.safeParse({ ...BASE, parties: [...PARTIES, { id: 'supplier', name: 'Dup', kind: 'third-party' }] })
        .success,
    ).toBe(false);
  });
});

describe('party-question axis', () => {
  const withAxis = (axis: string) => ({
    ...BASE,
    objectives: [{ ...BASE.objectives[0], questions: [{ ...BASE.objectives[0].questions[0], axis }] }],
  });

  it("defaults a party question's axis to 'assessment'", () => {
    const q = WorkbookSchema.parse(BASE).objectives[0].questions[0];
    expect(q.grain === 'party' && q.axis).toBe('assessment');
  });

  it("parses an explicit axis: 'party'", () => {
    const q = WorkbookSchema.parse(withAxis('party')).objectives[0].questions[0];
    expect(q.grain === 'party' && q.axis).toBe('party');
  });

  it('rejects an unknown axis', () => {
    expect(WorkbookSchema.safeParse(withAxis('provider')).success).toBe(false);
  });
});

describe('workbook strata (S7 — R8)', () => {
  const wbWith = (strata: string[] | undefined) => ({
    meta: { id: 'w', version: '1', title: 'W' },
    sealLevels: [
      { seal: 0, name: 'S0', description: 'd' },
      { seal: 4, name: 'S4', description: 'd' },
    ],
    dimensions: [{ id: 'compute', name: 'Compute', ...(strata ? { strata } : {}), critical: true }],
    roles: ROLES,
    parties: PARTIES,
    objectives: [
      {
        id: 'O',
        name: 'O',
        weight: 100,
        questions: [
          {
            id: 'O.q1',
            grain: 'dimension',
            appliesTo: ['compute'],
            text: 't',
            why: 'w',
            role: 'ARCH',
            defaultMateriality: 'material',
            ladder: [{ id: 'choice-1', description: 'r', points: 0, seal: 0 }],
          },
        ],
      },
    ],
  });

  it('accepts ≥2 unique strata, and none at all', () => {
    expect(WorkbookSchema.safeParse(wbWith(['software', 'chips'])).success).toBe(true);
    expect(WorkbookSchema.safeParse(wbWith(undefined)).success).toBe(true);
  });

  it('rejects a single stratum — a one-stratum split is no split', () => {
    expect(WorkbookSchema.safeParse(wbWith(['software'])).success).toBe(false);
  });

  it('rejects repeated stratum names', () => {
    expect(WorkbookSchema.safeParse(wbWith(['chips', 'chips'])).success).toBe(false);
  });
});

describe('workbook front sheet (S11, audit R-7)', () => {
  it('defaults to [] when absent — old workbook files stay valid', () => {
    expect(WorkbookSchema.parse(BASE).frontSheet).toEqual([]);
    expect(DraftWorkbookSchema.parse(BASE).frontSheet).toEqual([]);
  });

  it('preserves lines and rejects empty lines under strict parse', () => {
    const lines = ['Ceiling: SEAL-2 is the range.', 'Blank is honest.'];
    expect(WorkbookSchema.parse({ ...BASE, frontSheet: lines }).frontSheet).toEqual(lines);
    expect(WorkbookSchema.safeParse({ ...BASE, frontSheet: [''] }).success).toBe(false);
    expect(DraftWorkbookSchema.safeParse({ ...BASE, frontSheet: [''] }).success).toBe(true);
  });
});

describe('optional prose: objective description and question why', () => {
  const withObjective = (patch: Record<string, unknown>) => ({
    ...BASE,
    objectives: [{ ...BASE.objectives[0], ...patch }],
  });
  const withQuestion = (patch: Record<string, unknown>) => ({
    ...BASE,
    objectives: [
      { ...BASE.objectives[0], questions: [{ ...BASE.objectives[0].questions[0], ...patch }] },
    ],
  });

  it('keeps an objective description when written', () => {
    const parsed = WorkbookSchema.parse(withObjective({ description: 'What this covers' }));
    expect(parsed.objectives[0].description).toBe('What this covers');
  });

  it('rejects a blank objective description', () => {
    expect(WorkbookSchema.safeParse(withObjective({ description: '' })).success).toBe(false);
  });

  it('leaves the description key absent when unwritten', () => {
    const parsed = WorkbookSchema.parse(BASE);
    expect('description' in parsed.objectives[0]).toBe(false);
  });

  it('keeps a why when written', () => {
    expect(WorkbookSchema.parse(withQuestion({ why: 'w' })).objectives[0].questions[0].why).toBe('w');
  });

  it('rejects a blank why', () => {
    expect(WorkbookSchema.safeParse(withQuestion({ why: '' })).success).toBe(false);
  });

  it('accepts a question with no why key at all', () => {
    const { why: _why, ...noWhy } = BASE.objectives[0].questions[0];
    const parsed = WorkbookSchema.parse({
      ...BASE,
      objectives: [{ ...BASE.objectives[0], questions: [noWhy] }],
    });
    expect('why' in parsed.objectives[0].questions[0]).toBe(false);
  });
});

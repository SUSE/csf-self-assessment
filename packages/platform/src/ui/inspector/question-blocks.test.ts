import { describe, expect, it } from 'vitest';
import type {
  CheckOpen,
  ContributorUnit,
  DontKnowRow,
  EvidenceRow,
  HeatDetail,
  HeatDetailRow,
  OpenGroup,
  ProvenanceUnit,
  RecommendationCard,
  StaircaseStepView,
} from '../../analytics';
import type { Objective, RoleDef } from '../../schema';
import {
  byObjective,
  checkBlocks,
  contributorBlocks,
  dontKnowBlocks,
  evidenceBlocks,
  heatMarkBlocks,
  objectiveQuestionBlocks,
  openUnitBlocks,
  provenanceBlocks,
  staircaseRungBlocks,
  triggerQuestionBlocks,
} from './question-blocks';

function row(over: Partial<HeatDetailRow> = {}): HeatDetailRow {
  return {
    questionId: 'SOV-1.a',
    questionText: 'Who holds the keys?',
    label: 'Compute',
    roleName: 'Architecture',
    reading: 'SEAL-2',
    state: 'answered',
    seal: 2,
    evidence: false,
    ...over,
  };
}

const detail = (rows: HeatDetailRow[], title = 'Technology Sovereignty × Carry'): HeatDetail => ({
  title,
  summary: `SEAL-1 · minimum over ${rows.length} answers`,
  rows,
});

describe('objectiveQuestionBlocks', () => {
  it('keeps authored order and resolves role names with an id fallback', () => {
    const objective: Objective = {
      id: 'SOV-2',
      name: 'Legal sovereignty',
      weight: 10,
      questions: [
        {
          id: 'SOV-2.b',
          grain: 'party',
          axis: 'assessment',
          text: 'Second authored question',
          why: 'Why',
          role: 'LEG',
          defaultMateriality: 'material',
          ladder: [{ id: 'choice-1', description: 'No', points: 0, seal: 0 }],
        },
        {
          id: 'SOV-2.a',
          grain: 'party',
          axis: 'assessment',
          text: 'First id, second in the workbook',
          why: 'Why',
          role: 'UNKNOWN',
          defaultMateriality: 'material',
          ladder: [{ id: 'choice-1', description: 'No', points: 0, seal: 0 }],
        },
      ],
    };
    const roles: RoleDef[] = [{ id: 'LEG', name: 'Legal' }];

    expect(objectiveQuestionBlocks(objective, roles)).toEqual([
      {
        questionId: 'SOV-2.b',
        text: 'Second authored question',
        chips: ['Legal'],
        units: [],
      },
      {
        questionId: 'SOV-2.a',
        text: 'First id, second in the workbook',
        chips: ['UNKNOWN'],
        units: [],
      },
    ]);
  });
});

describe('heatMarkBlocks', () => {
  it('states a question once and lists the units that differ under it', () => {
    const { blocks } = heatMarkBlocks(
      detail([
        row({ label: 'Compute' }),
        row({ label: 'Storage', seal: 3, reading: 'SEAL-3' }),
        row({ questionId: 'SOV-1.b', questionText: 'Second?', label: 'Compute' }),
      ]),
    );
    expect(blocks.map((b) => b.questionId)).toEqual(['SOV-1.a', 'SOV-1.b']);
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual(['Compute', 'Storage']);
    expect(blocks[0]?.units.map((u) => u.reading?.seal)).toEqual([2, 3]);
  });

  it('hoists a facet the whole mark shares out of every block', () => {
    const { shared, blocks } = heatMarkBlocks(
      detail([
        row({ label: 'whole estate', roleName: 'Legal' }),
        row({ questionId: 'SOV-1.b', label: 'whole estate', roleName: 'Legal' }),
      ]),
    );
    expect(shared).toBe('whole estate · Legal');
    expect(blocks.every((b) => b.chips.length === 0)).toBe(true);
    // Nothing left to name, so the row falls back to the reading's own words.
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual(['']);
  });

  it('does not hoist a facet the mark title already names', () => {
    const { shared } = heatMarkBlocks(
      detail([row({ label: 'Compute' }), row({ questionId: 'SOV-1.b', label: 'Compute' })],
        'Data & AI Sovereignty × Compute'),
    );
    expect(shared).toBe('Architecture');
  });

  it('matches the title by its parts, so a role is not eaten by an objective name', () => {
    const { shared } = heatMarkBlocks(
      detail(
        [
          row({ label: 'The institution', roleName: 'Legal' }),
          row({ label: 'Acme Cloud EU', roleName: 'Legal' }),
        ],
        'Legal & Jurisdictional Sovereignty × Carry',
      ),
    );
    expect(shared).toBe('Legal');
  });

  it('always chips the role — a question has one, so it can never tell units apart', () => {
    const { blocks } = heatMarkBlocks(
      detail([
        row({ label: 'Compute', roleName: 'Architecture' }),
        row({ label: 'Storage', roleName: 'Architecture' }),
        row({ questionId: 'SOV-1.b', label: 'whole estate', roleName: 'Procurement' }),
      ]),
    );
    expect(blocks[0]?.chips).toEqual(['Architecture']);
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual(['Compute', 'Storage']);
    // The single-unit block keeps its target on the row rather than lifting it.
    expect(blocks[1]?.chips).toEqual(['Procurement']);
    expect(blocks[1]?.units.map((u) => u.facet)).toEqual(['whole estate']);
  });

  it('carries the reading typed, so an off-ladder answer never renders as a rung', () => {
    const { blocks } = heatMarkBlocks(
      detail([
        row({ state: 'dont-know', seal: null, reading: "don't-know" }),
        row({ label: 'Storage', state: 'na', seal: null, reading: 'n/a', evidence: true }),
      ]),
    );
    expect(blocks[0]?.units.map((u) => [u.reading?.state, u.reading?.seal])).toEqual([
      ['dont-know', null],
      ['na', null],
    ]);
    expect(blocks[0]?.units[1]?.reading?.evidence).toBe(true);
  });
});

describe('triggerQuestionBlocks', () => {
  const card = (): RecommendationCard => ({
    id: 'rec-1',
    title: 'Sovereign landing zone',
    action: 'Do the thing',
    body: [],
    horizon: 'renewal',
    trigger: { link: { kind: 'dimension', id: 'compute' }, label: 'Compute', seal: 1 },
    fired: [],
    questions: [
      {
        questionId: 'SOV-1.a',
        questionText: 'Who holds the keys?',
        seal: 1,
        targets: [
          { key: 'SOV-1.a|compute||', targetLabel: 'Compute', seal: 1 },
          { key: 'SOV-1.a|storage||', targetLabel: 'Storage', seal: 2 },
        ],
      },
    ],
  });

  it('reads each answered target as a unit under its question', () => {
    const blocks = triggerQuestionBlocks(card());
    expect(blocks.map((b) => [b.questionId, b.text, b.chips])).toEqual([
      ['SOV-1.a', 'Who holds the keys?', []],
    ]);
    expect(blocks[0]?.units.map((u) => [u.facet, u.reading?.seal, u.reading?.text])).toEqual([
      ['Compute', 1, 'SEAL-1'],
      ['Storage', 2, 'SEAL-2'],
    ]);
  });

  it('claims no evidence — a trigger target does not carry it', () => {
    expect(triggerQuestionBlocks(card())[0]?.units.every((u) => u.reading?.evidence === false)).toBe(
      true,
    );
  });
});

describe('dontKnowBlocks', () => {
  const admitted = (over: Partial<DontKnowRow> = {}): DontKnowRow => ({
    key: 'SOV-2.enforceability|party:acme-eu',
    questionId: 'SOV-2.enforceability',
    questionText: 'Could a judgment be enforced against this party?',
    label: 'Acme Cloud Europe SAS',
    roleName: 'Legal',
    gatesFloor: true,
    ...over,
  });

  it('groups the admissions by question, chips the role and rows the target', () => {
    const blocks = dontKnowBlocks([
      admitted(),
      admitted({ key: 'x', label: 'Northstar Edge Networks' }),
      admitted({ questionId: 'SOV-5.hardware-provenance', roleName: 'Procurement', label: 'Network' }),
    ]);
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-2.enforceability', ['Legal']],
      ['SOV-5.hardware-provenance', ['Procurement']],
    ]);
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual([
      'Acme Cloud Europe SAS',
      'Northstar Edge Networks',
    ]);
  });

  it('carries no reading — the whole rail is one state, said once above it', () => {
    expect(dontKnowBlocks([admitted()])[0]?.units[0]?.reading).toBeUndefined();
  });
});

describe('evidenceBlocks', () => {
  const undefended = (over: Partial<EvidenceRow> = {}): EvidenceRow => ({
    key: 'SOV-2.compellability|null|null|siliconware',
    questionId: 'SOV-2.compellability',
    questionText: 'Could this party be compelled?',
    meta: 'SiliconWare Corp. · SEAL-4 · Legal',
    label: 'SiliconWare Corp.',
    roleName: 'Legal',
    seal: 4,
    ...over,
  });

  it('groups by question, chips the role, and badges the claim it cannot defend', () => {
    const blocks = evidenceBlocks([
      undefended(),
      undefended({ key: 'x', label: 'Northstar Edge Networks', seal: 2 }),
      undefended({ questionId: 'SOV-5.provenance', roleName: 'Procurement', label: 'Network' }),
    ]);
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-2.compellability', ['Legal']],
      ['SOV-5.provenance', ['Procurement']],
    ]);
    expect(blocks[0]?.units.map((u) => [u.facet, u.reading?.text])).toEqual([
      ['SiliconWare Corp.', 'SEAL-4'],
      ['Northstar Edge Networks', 'SEAL-2'],
    ]);
    // The row IS the missing document, so no unit claims a clip.
    expect(blocks[0]?.units.every((u) => u.reading?.evidence === false)).toBe(true);
  });
});

describe('byObjective', () => {
  const objective = (id: string, questionIds: string[]): Objective => ({
    id,
    name: `${id} name`,
    weight: 10,
    questions: questionIds.map((qid) => ({
      id: qid,
      grain: 'party',
      axis: 'assessment',
      text: qid,
      why: 'Why',
      role: 'LEG',
      defaultMateriality: 'material',
      ladder: [{ id: 'choice-1', description: 'No', points: 0, seal: 0 }],
    })),
  });
  const block = (questionId: string) => ({ questionId, text: questionId, chips: [], units: [] });

  it('files each block under its objective in workbook order, dropping empty objectives', () => {
    const groups = byObjective(
      [objective('SOV-1', ['SOV-1.a']), objective('SOV-2', ['SOV-2.a', 'SOV-2.b'])],
      [block('SOV-2.b'), block('SOV-1.a')],
    );
    expect(groups.map((g) => [g.objectiveId, g.blocks.map((b) => b.questionId)])).toEqual([
      ['SOV-1', ['SOV-1.a']],
      ['SOV-2', ['SOV-2.b']],
    ]);
  });

  it('drops a block whose question the workbook no longer has', () => {
    expect(byObjective([objective('SOV-1', ['SOV-1.a'])], [block('gone')])).toEqual([]);
  });
});

describe('openUnitBlocks', () => {
  const group = (units: OpenGroup['units']): OpenGroup => ({
    key: 'party:northstar',
    label: 'Northstar Edge Networks',
    units,
  });
  const open = (over: Partial<OpenGroup['units'][number]> = {}): OpenGroup['units'][number] => ({
    questionId: 'SOV-2.a',
    questionText: 'Could an EU auditor audit this party?',
    objectiveId: 'SOV-2',
    roleName: 'Procurement',
    label: 'Northstar Edge Networks',
    ...over,
  });

  it('groups the backlog by question and chips the role', () => {
    const blocks = openUnitBlocks(group([open(), open({ questionId: 'SOV-2.b', roleName: 'Legal' })]));
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-2.a', ['Procurement']],
      ['SOV-2.b', ['Legal']],
    ]);
  });

  it('drops a unit label that only repeats the owner, and keeps one that does not', () => {
    const blocks = openUnitBlocks(group([open(), open({ label: 'Storage · chips' })]));
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual(['Storage · chips']);
  });

  it('carries no reading — an open unit has no answer to show', () => {
    const blocks = openUnitBlocks(group([open({ label: 'Storage' })]));
    expect(blocks[0]?.units[0]?.reading).toBeUndefined();
  });
});

describe('checkBlocks', () => {
  const open = (over: Partial<CheckOpen> = {}): CheckOpen => ({
    key: 'SOV-3.a|dimension:compute',
    questionId: 'SOV-3.a',
    questionText: 'Which layer runs this?',
    target: { kind: 'dimension', dimension: 'compute' },
    label: 'Compute',
    ...over,
  });

  it('groups the invitation by question and chips nothing', () => {
    const blocks = checkBlocks([
      open(),
      open({ key: 'x', label: 'Storage' }),
      open({ questionId: 'SOV-3.b', questionText: 'Second?', label: 'Network' }),
    ]);
    expect(blocks.map((b) => [b.questionId, b.text, b.chips])).toEqual([
      ['SOV-3.a', 'Which layer runs this?', []],
      ['SOV-3.b', 'Second?', []],
    ]);
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual(['Compute', 'Storage']);
  });

  it('carries no reading — what a unit answers is one press further in', () => {
    expect(checkBlocks([open()])[0]?.units[0]?.reading).toBeUndefined();
  });
});

describe('staircaseRungBlocks', () => {
  const rung = (rows: StaircaseStepView['rows']): StaircaseStepView => ({
    key: 'step:1',
    floor: 1,
    floorName: 'Minimal Sovereignty',
    title: 'SEAL-1 · Minimal Sovereignty',
    count: rows.length,
    unlocks: 'Fix these 2 → the floor rises to SEAL-2.',
    rows,
  });
  const gating = (over: Partial<StaircaseStepView['rows'][number]> = {}): StaircaseStepView['rows'][number] => ({
    key: 'SOV-4.a|compute||',
    questionId: 'SOV-4.a',
    questionText: 'Who can read the data at rest?',
    label: 'Compute',
    roleName: 'Architecture',
    seal: 1,
    evidence: false,
    ...over,
  });

  it('groups the rung by question, chips the role and rows the target', () => {
    const blocks = staircaseRungBlocks(
      rung([
        gating(),
        gating({ key: 'x', label: 'Storage' }),
        gating({ questionId: 'SOV-4.b', roleName: 'Legal', label: 'Acme Cloud Europe SAS' }),
      ]),
    );
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-4.a', ['Architecture']],
      ['SOV-4.b', ['Legal']],
    ]);
    expect(blocks[0]?.units.map((u) => [u.facet, u.reading?.text])).toEqual([
      ['Compute', 'SEAL-1'],
      ['Storage', 'SEAL-1'],
    ]);
  });

  it('carries the clip a gating answer holds', () => {
    const blocks = staircaseRungBlocks(rung([gating({ evidence: true })]));
    expect(blocks[0]?.units[0]?.reading).toEqual({
      state: 'answered',
      seal: 1,
      text: 'SEAL-1',
      evidence: true,
    });
  });
});

describe('contributorBlocks', () => {
  const placed = (over: Partial<ContributorUnit> = {}): ContributorUnit => ({
    key: 'SOV-6.a|dimension:compute',
    questionId: 'SOV-6.a',
    questionText: 'Who operates the control plane?',
    label: 'Compute',
    state: 'answered',
    seal: 2,
    evidence: false,
    answer: 'SEAL 2',
    settled: 'sole source',
    ...over,
  });

  it('groups by question, chips nothing, and makes the answer the reading', () => {
    const blocks = contributorBlocks([
      placed(),
      placed({ key: 'x', label: 'Storage', seal: 3, answer: 'SEAL 3', evidence: true }),
      placed({ questionId: 'SOV-6.b', questionText: 'Second?', label: 'Network' }),
    ]);
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-6.a', []],
      ['SOV-6.b', []],
    ]);
    expect(blocks[0]?.units.map((u) => [u.facet, u.reading?.text, u.reading?.evidence])).toEqual([
      ['Compute', 'SEAL 2', false],
      ['Storage', 'SEAL 3', true],
    ]);
  });

  it('carries an off-ladder answer in its own words, never as a rung', () => {
    const blocks = contributorBlocks([
      placed({ state: 'dont-know', seal: null, answer: "don't know" }),
    ]);
    expect(blocks[0]?.units[0]?.reading).toEqual({
      state: 'dont-know',
      seal: null,
      text: "don't know",
      evidence: false,
    });
  });
});

describe('provenanceBlocks', () => {
  const unit = (over: Partial<ProvenanceUnit> = {}): ProvenanceUnit => ({
    key: 'SOV-7.a|dimension:compute|1',
    questionId: 'SOV-7.a',
    questionText: 'Who holds the encryption keys?',
    label: 'Compute',
    roleName: 'Architecture',
    settled: '',
    reading: { state: 'answered', seal: 2, evidence: false, answer: 'SEAL 2' },
    ...over,
  });

  it('groups by question, chips the role and rows the target', () => {
    const blocks = provenanceBlocks([
      unit(),
      unit({ key: 'x', label: 'Storage' }),
      unit({ questionId: 'SOV-7.b', questionText: 'Second?', roleName: 'Legal', label: 'Network' }),
    ]);
    expect(blocks.map((b) => [b.questionId, b.chips])).toEqual([
      ['SOV-7.a', ['Architecture']],
      ['SOV-7.b', ['Legal']],
    ]);
    expect(blocks[0]?.units.map((u) => [u.facet, u.reading?.text])).toEqual([
      ['Compute', 'SEAL 2'],
      ['Storage', 'SEAL 2'],
    ]);
  });

  it('joins how a disputed row settled onto its target, so two records read apart', () => {
    const blocks = provenanceBlocks([
      unit({ settled: 'kept Jane' }),
      unit({ key: 'x', settled: 'kept Sam' }),
    ]);
    expect(blocks[0]?.units.map((u) => u.facet)).toEqual([
      'Compute · kept Jane',
      'Compute · kept Sam',
    ]);
  });

  it('keeps a null reading null, where the resolution emptied the unit', () => {
    expect(provenanceBlocks([unit({ reading: null })])[0]?.units[0]?.reading).toBeNull();
  });
});

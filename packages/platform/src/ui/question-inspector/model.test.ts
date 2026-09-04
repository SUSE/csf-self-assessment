import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Party } from '../../schema';
import { answerFor } from '../../assessment';
import {
  answeredUnitCount,
  answerLadder,
  assessmentSeal,
  criticalDimensions,
  dimensionCoverage,
  partyCoverage,
  questionGrainLabel,
  questionLowestSeal,
  questionUnitSeals,
} from './model';

const G = { groupId: 'g1', placement: 'individual' as const };

// A workbook with one dimension question (compute[critical] + network) and one
// party-axis question — enough to exercise both fan-out shapes.
const WB = WorkbookSchema.parse({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd0' },
    { seal: 1, name: 'S1', description: 'd1' },
    { seal: 2, name: 'S2', description: 'd2' },
    { seal: 3, name: 'S3', description: 'd3' },
    { seal: 4, name: 'S4', description: 'd4' },
  ],
  roles: [{ id: 'ARCH', name: 'Architecture' }, { id: 'LEG', name: 'Legal' }],
  parties: [
    { id: 'institution', name: 'Institution', kind: 'assessed' },
    { id: 'provider', name: 'Provider', kind: 'third-party' },
  ],
  dimensions: [
    { id: 'compute', name: 'Compute', critical: true },
    { id: 'network', name: 'Network', critical: false },
  ],
  objectives: [
    {
      id: 'SOV-1',
      name: 'O',
      weight: 100,
      questions: [
        {
          id: 'd1',
          grain: 'dimension',
          appliesTo: ['compute', 'network'],
          text: 'q?',
          why: 'b',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'r0', points: 0, seal: 0 },
            { id: 'choice-2', description: 'r2', points: 50, seal: 2 },
            { id: 'choice-3', description: 'r4', points: 100, seal: 4 },
          ],
        },
        {
          id: 'p1',
          grain: 'party',
          axis: 'party',
          text: 'q?',
          why: 'b',
          role: 'LEG',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'r1', points: 25, seal: 1 },
            { id: 'choice-2', description: 'r3', points: 75, seal: 3 },
          ],
        },
      ],
    },
  ],
});

const PARTIES: Party[] = [
  { id: 'institution', name: 'Institution', type: 'institution', serves: [] },
  { id: 'provider', name: 'Provider', type: 'provider', serves: ['compute', 'network'] },
];

const dq = WB.objectives[0].questions[0];
const pq = WB.objectives[0].questions[1];

describe('criticalDimensions', () => {
  it('returns only the critical dimension ids', () => {
    expect(criticalDimensions(WB)).toEqual(new Set(['compute']));
  });
});

describe('questionLowestSeal', () => {
  it('is the min selected seal across a dimension question’s covered dimensions', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-3' }, G),
    ];
    expect(questionLowestSeal(WB, PARTIES, answers, dq)).toBe(2);
  });

  it('is the min selected seal across a party-axis question’s declared parties', () => {
    const answers = [
      answerFor('p1', { kind: 'party', party: 'institution' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('p1', { kind: 'party', party: 'provider' }, { state: 'answered', rungId: 'choice-1' }, G),
    ];
    expect(questionLowestSeal(WB, PARTIES, answers, pq)).toBe(1);
  });

  it('ignores don’t-know / unanswered units, counting only answered seals', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'dont-know' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-3' }, G),
    ];
    // compute is a don't-know, network answered at 4 → the lowest ANSWERED is 4.
    expect(questionLowestSeal(WB, PARTIES, answers, dq)).toBe(4);
  });

  it('is null when nothing is answered (a bare workbook)', () => {
    expect(questionLowestSeal(WB, PARTIES, [], dq)).toBeNull();
  });
});

describe('questionUnitSeals', () => {
  it('resolves each unit to its selected seal or recorded state', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'dont-know' }, G),
    ];
    expect(questionUnitSeals(WB, PARTIES, answers, dq)).toEqual([
      { target: { kind: 'dimension', dimension: 'compute' }, state: 'answered', rungId: 'choice-2', seal: 2 },
      { target: { kind: 'dimension', dimension: 'network' }, state: 'dont-know', rungId: null, seal: null },
    ]);
  });

  it('marks every unit unanswered when the assessment carries nothing', () => {
    expect(questionUnitSeals(WB, PARTIES, [], pq)).toEqual([
      { target: { kind: 'party', party: 'institution' }, state: 'unanswered', rungId: null, seal: null },
      { target: { kind: 'party', party: 'provider' }, state: 'unanswered', rungId: null, seal: null },
    ]);
  });
});

describe('questionGrainLabel', () => {
  it('describes a dimension-grain question', () => {
    expect(questionGrainLabel(dq)).toBe(
      'Dimension grain · one answer per applicable dimension',
    );
  });

  it('describes a party-axis question', () => {
    expect(questionGrainLabel(pq)).toBe('Party grain · one answer per declared party');
  });
});

describe('answeredUnitCount', () => {
  it('counts only units with a selected rung, not don’t-know / unanswered', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'dont-know' }, G),
    ];
    expect(answeredUnitCount(questionUnitSeals(WB, PARTIES, answers, dq))).toBe(1);
  });
});

describe('dimensionCoverage', () => {
  it('resolves each applicable dimension with its lowest seal and critical flag', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-3' }, G),
    ];
    expect(dimensionCoverage(WB, dq, questionUnitSeals(WB, PARTIES, answers, dq))).toEqual([
      { id: 'compute', name: 'Compute', critical: true, strata: [], seal: 2, strataSeals: [] },
      { id: 'network', name: 'Network', critical: false, strata: [], seal: 4, strataSeals: [] },
    ]);
  });

  it('is empty for a party-axis question', () => {
    expect(dimensionCoverage(WB, pq, questionUnitSeals(WB, PARTIES, [], pq))).toEqual([]);
  });
});

describe('partyCoverage', () => {
  it('resolves each declared party with its seal and kind', () => {
    const answers = [
      answerFor('p1', { kind: 'party', party: 'institution' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('p1', { kind: 'party', party: 'provider' }, { state: 'answered', rungId: 'choice-1' }, G),
    ];
    expect(partyCoverage(WB, PARTIES, pq, questionUnitSeals(WB, PARTIES, answers, pq))).toEqual([
      { id: 'institution', name: 'Institution', kind: 'assessed', seal: 3 },
      { id: 'provider', name: 'Provider', kind: 'third-party', seal: 1 },
    ]);
  });

  it('is empty for a dimension-grain question', () => {
    expect(partyCoverage(WB, PARTIES, dq, questionUnitSeals(WB, PARTIES, [], dq))).toEqual([]);
  });
});

describe('assessmentSeal', () => {
  it('is null for a question that is not asked once for the whole estate', () => {
    expect(assessmentSeal(dq, questionUnitSeals(WB, PARTIES, [], dq))).toBeNull();
    expect(assessmentSeal(pq, questionUnitSeals(WB, PARTIES, [], pq))).toBeNull();
  });
});

describe('answerLadder', () => {
  it('marks every rung, flags the lowest selected as binding, and counts seats', () => {
    const answers = [
      answerFor('d1', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-2' }, G),
      answerFor('d1', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-3' }, G),
    ];
    const unitSeals = questionUnitSeals(WB, PARTIES, answers, dq);
    const lowest = questionLowestSeal(WB, PARTIES, answers, dq);
    expect(answerLadder(WB, dq, unitSeals, lowest)).toEqual([
      { rungId: 'choice-1', seal: 0, name: 'S0', description: 'r0', selected: false, binding: false, seats: 0 },
      { rungId: 'choice-2', seal: 2, name: 'S2', description: 'r2', selected: true, binding: true, seats: 1 },
      { rungId: 'choice-3', seal: 4, name: 'S4', description: 'r4', selected: true, binding: false, seats: 1 },
    ]);
  });
});

describe('a resolved rung, not a stored SEAL (instrument-S1)', () => {
  const REPEATED = WorkbookSchema.parse({
    ...WB,
    objectives: [
      {
        id: 'SOV-1',
        name: 'O',
        weight: 100,
        questions: [
          {
            id: 'r1',
            grain: 'party',
            axis: 'assessment',
            text: 'q?',
            why: 'b',
            role: 'ARCH',
            defaultMateriality: 'material',
            ladder: [
              { id: 'choice-1', description: 'first', points: 40, seal: 2 },
              { id: 'choice-2', description: 'second', points: 60, seal: 2 },
            ],
          },
        ],
      },
    ],
  });

  it('reports the SEAL of the rung the unit names', () => {
    const question = REPEATED.objectives[0].questions[0];
    const answers = [answerFor('r1', { kind: 'assessment' }, { state: 'answered', rungId: 'choice-2' }, G)];
    expect(questionUnitSeals(REPEATED, PARTIES, answers, question)).toEqual([
      { target: { kind: 'assessment' }, state: 'answered', rungId: 'choice-2', seal: 2 },
    ]);
  });
});

describe('answerLadder on a repeated-SEAL ladder', () => {
  const WB_FLAT = WorkbookSchema.parse({
    meta: { id: 'wb-flat', version: '1.0.0', title: 'T' },
    sealLevels: [{ seal: 4, name: 'S4', description: 'd4' }],
    roles: [{ id: 'ARCH', name: 'Architecture' }],
    parties: [{ id: 'institution', name: 'Institution', kind: 'assessed' }],
    dimensions: [],
    objectives: [
      {
        id: 'SOV-9',
        name: 'O',
        weight: 100,
        questions: [
          {
            id: 'SOV-9.flat',
            grain: 'party',
            axis: 'assessment',
            text: 'q?',
            why: 'b',
            role: 'ARCH',
            defaultMateriality: 'material',
            ladder: [
              { id: 'choice-1', description: 'Ad-hoc audits', points: 0, seal: 4 },
              { id: 'choice-2', description: 'Regular audits', points: 50, seal: 4 },
              { id: 'choice-3', description: 'Continuous assurance', points: 100, seal: 4 },
            ],
          },
        ],
      },
    ],
  });
  const FLAT_PARTIES: Party[] = [
    { id: 'institution', name: 'Institution', type: 'institution', serves: [] },
  ];
  const Q = WB_FLAT.objectives[0].questions[0];

  it('walks the ladder in authored order, never sorted by SEAL', () => {
    const unitSeals = questionUnitSeals(WB_FLAT, FLAT_PARTIES, [], Q);
    const rows = answerLadder(WB_FLAT, Q, unitSeals, null);
    expect(rows.map((r) => r.rungId)).toEqual(['choice-1', 'choice-2', 'choice-3']);
    expect(rows.map((r) => r.description)).toEqual([
      'Ad-hoc audits',
      'Regular audits',
      'Continuous assurance',
    ]);
  });

  it('seats the unit on the rung it picked, not on every rung at that SEAL', () => {
    const answers = [
      answerFor('SOV-9.flat', { kind: 'assessment' }, { state: 'answered', rungId: 'choice-2' }, G),
    ];
    const unitSeals = questionUnitSeals(WB_FLAT, FLAT_PARTIES, answers, Q);
    const lowest = questionLowestSeal(WB_FLAT, FLAT_PARTIES, answers, Q);
    const rows = answerLadder(WB_FLAT, Q, unitSeals, lowest);
    expect(rows.map((r) => r.seats)).toEqual([0, 1, 0]);
    expect(rows.map((r) => r.selected)).toEqual([false, true, false]);
  });

  it('carries the rung id every row is keyed by', () => {
    const unitSeals = questionUnitSeals(WB_FLAT, FLAT_PARTIES, [], Q);
    expect(answerLadder(WB_FLAT, Q, unitSeals, null).map((r) => r.rungId)).toEqual(
      Q.ladder.map((r) => r.id),
    );
  });
});

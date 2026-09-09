import { describe, expect, it } from 'vitest';
import { alexRaw, workbookAssessmentRaw } from '../test-fixtures';
import { AssessmentSchema, WorkbookAssessmentSchema } from '../schema';
import { land } from '../merge/land';
import { evaluate } from '../score-engine';
import { ribbonModel } from './ribbon';

const alex = AssessmentSchema.parse(alexRaw);
const WA = WorkbookAssessmentSchema.parse(workbookAssessmentRaw);
const A = evaluate(alex.workbook, {
  ...alex,
  parties: [...alex.parties, ...(alex.partiesAdded ?? [])],
});

describe('ribbonModel', () => {
  it('reads the base off the one engine result', () => {
    expect(ribbonModel(A)).toEqual({
      unitsPlaced: 81,
      unitsTotal: 81,
      dontKnow: 1,
      parties: 4,
      contributors: 0,
      floor: A.overall.floor,
    });
  });

  it('carries the floor for paint, and null when there is no gate', () => {
    expect(ribbonModel(A).floor).toBe(A.overall.floor);
    expect(ribbonModel({ ...A, overall: { ...A.overall, floor: null } }).floor).toBeNull();
  });

  it('counts the distinct participants the ledger names', () => {
    const outcome = land(
      { parties: WA.parties, answers: [] },
      [],
      alex,
      { resolutions: [], partyDecisions: [] },
      { id: '11111111-1111-4111-8111-111111111111', at: 'T1', note: '' },
    );
    if (!outcome.ok) throw new Error('Alex should land with nothing to decide');
    const ledger = outcome.ledger;
    expect(ribbonModel({ ...A, credibility: { ...A.credibility, ledger } }).contributors).toBe(1);
    const mixed = [
      ...ledger,
      { ...ledger[0], id: '22222222-2222-4222-8222-222222222222', participant: 'Jane' },
    ];
    expect(ribbonModel({ ...A, credibility: { ...A.credibility, ledger: mixed } }).contributors).toBe(2);
  });

  it('placed is the units carrying any answer', () => {
    const model = ribbonModel({
      ...A,
      units: { total: 96, answered: 84, dontKnow: 1, na: 8, unanswered: 3 },
    });
    expect(model.unitsPlaced).toBe(93);
    expect(model.unitsTotal).toBe(96);
    expect(model.dontKnow).toBe(1);
  });
});

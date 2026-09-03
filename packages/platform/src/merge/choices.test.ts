import { describe, expect, it } from 'vitest';
import type { Answer, ClashResolution, Question, Seal, Target } from '../schema';
import { QuestionSchema } from '../schema';
import type { GrainClash, ReviewCandidate, UnitClash } from './clash-types';
import { choiceKey, optionsFor, reanswerCells, upsertResolution } from './choices';

const STORAGE: Target = { kind: 'dimension', dimension: 'storage' };
const G = { groupId: 'g1', placement: 'individual' as const };

const QUESTION: Question = QuestionSchema.parse({
  id: 'SOV-1.dq',
  grain: 'dimension',
  appliesTo: ['storage'],
  text: 'q?',
  why: 'b',
  role: 'SEC',
  defaultMateriality: 'material',
  ladder: [0, 1, 2, 3, 4].map((seal, i) => ({ id: `choice-${i + 1}`, description: `r${seal}`, points: seal * 25, seal })),
});

const answered = (seal: Seal, target: Target = STORAGE): Answer => ({
  questionId: 'SOV-1.dq',
  target,
  state: 'answered',
  rungId: `choice-${seal + 1}`,
  gesture: G,
});

const dontKnow = (): Answer => ({ questionId: 'SOV-1.dq', target: STORAGE, state: 'dont-know', gesture: G });
const na = (): Answer => ({ questionId: 'SOV-1.dq', target: STORAGE, state: 'na', gesture: G });

const candidate = (from: string, answer: Answer): ReviewCandidate => ({ from, answer, claim: null, authority: 'out-of-claim' });

const unitClash = (clash: UnitClash['clash'], base: Answer, incoming: Answer): UnitClash => ({
  kind: 'unit-clash',
  clash,
  questionId: 'SOV-1.dq',
  target: STORAGE,
  base: candidate('Alex', base),
  incoming: candidate('Jane', incoming),
});

const grainClash = (strata: string[]): GrainClash => ({
  kind: 'grain-clash',
  clash: 'grain',
  questionId: 'SOV-1.dq',
  dimension: 'storage',
  target: { kind: 'dimension', dimension: 'storage' },
  rollUp: candidate('Alex', answered(2)),
  strata: strata.map((stratum) => {
    const target: Target = { kind: 'dimension-stratum', dimension: 'storage', stratum };
    return {
      stratum,
      target: { kind: 'dimension-stratum', dimension: 'storage', stratum },
      candidate: candidate('Jane', answered(1, target)),
    };
  }),
  rollUpSide: 'base',
});

describe('upsertResolution', () => {
  const A: ClashResolution = {
    questionId: 'SOV-1.q',
    target: { kind: 'dimension', dimension: 'storage' },
    choice: { kind: 'take', from: 'Alex' },
    note: '',
  };
  const B: ClashResolution = { ...A, choice: { kind: 'take', from: 'Jane' } };
  const C: ClashResolution = { ...A, target: { kind: 'dimension', dimension: 'compute' } };
  const D: ClashResolution = {
    ...A,
    target: { kind: 'dimension-stratum', dimension: 'storage', stratum: 'chips' },
  };

  it('upsertResolution replaces the decision on a unit and appends a new one', () => {
    expect(upsertResolution([A], B)).toEqual([B]);
    expect(upsertResolution([A], C)).toEqual([A, C]);
    expect(upsertResolution([], A)).toEqual([A]);
    expect(upsertResolution([A], D)).toHaveLength(2);
  });
});

describe('choiceKey', () => {
  it('choiceKey is stable per choice', () => {
    expect(choiceKey({ kind: 'take', from: 'Jane' })).toBe('take:Jane');
    expect(choiceKey({ kind: 'reanswer', rungId: 'choice-4' })).toBe('reanswer:choice-4');
    expect(choiceKey({ kind: 'grain', keep: 'roll-up' })).toBe('grain:roll-up');
  });
});

describe('optionsFor', () => {
  it('a divergence offers both sides then every rung', () => {
    const options = optionsFor(unitClash('divergence', answered(2), answered(1)), QUESTION);
    expect(options).toHaveLength(7);
    expect(options[0]).toEqual({ key: 'take:Alex', label: 'Take Alex’s “r2” (SEAL 2)', choice: { kind: 'take', from: 'Alex' } });
    expect(options[1]).toEqual({ key: 'take:Jane', label: 'Take Jane’s “r1” (SEAL 1)', choice: { kind: 'take', from: 'Jane' } });
    expect(options[2].label).toBe('Re-answer at “r0” (SEAL 0)');
    expect(options[6].label).toBe('Re-answer at “r4” (SEAL 4)');
  });

  it('a gap offers the knowledge first and no rungs', () => {
    const options = optionsFor(unitClash('gap', dontKnow(), answered(1)), QUESTION);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.label)).toEqual([
      'Take the knowledge — Jane’s “r1” (SEAL 1)',
      'Keep don’t know — Alex did not know',
    ]);
  });

  it('a scope clash asks whether it applies', () => {
    const options = optionsFor(unitClash('scope', answered(2), na()), QUESTION);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.label)).toEqual([
      'It applies — take Alex’s “r2” (SEAL 2)',
      'It doesn’t apply — take Jane’s n/a',
    ]);
  });

  it('a grain clash names what each side destroys', () => {
    const options = optionsFor(grainClash(['service', 'software', 'hardware', 'chips']), QUESTION);
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({
      key: 'grain:strata',
      label: 'Keep the strata — 4 stratum answers stand, the roll-up is dropped',
      choice: { kind: 'grain', keep: 'strata' },
    });
    expect(options[1]).toEqual({
      key: 'grain:roll-up',
      label: 'Keep the roll-up — deletes 4 stratum answers',
      choice: { kind: 'grain', keep: 'roll-up' },
    });

    const one = optionsFor(grainClash(['service']), QUESTION);
    expect(one.map((o) => o.label)).toEqual([
      'Keep the strata — 1 stratum answer stands, the roll-up is dropped',
      'Keep the roll-up — deletes 1 stratum answer',
    ]);
  });
});

describe('reanswerCells', () => {
  it('pairs each re-answer option with its rung, in authored order', () => {
    const options = optionsFor(unitClash('divergence', answered(2), answered(1)), QUESTION);
    const cells = reanswerCells(options, QUESTION);
    expect(cells).toHaveLength(5);
    expect(cells.map((c) => c.position)).toEqual([1, 2, 3, 4, 5]);
    expect(cells.map((c) => c.rungId)).toEqual([
      'choice-1',
      'choice-2',
      'choice-3',
      'choice-4',
      'choice-5',
    ]);
    expect(cells.map((c) => c.seal)).toEqual([0, 1, 2, 3, 4]);
    expect(cells.map((c) => c.key)).toEqual(
      options.slice(2).map((o) => o.key),
    );
    expect(cells[2].label).toBe('Re-answer at “r2” (SEAL 2)');
  });

  it('tells two rungs at one SEAL apart by position', () => {
    const flat: Question = QuestionSchema.parse({
      ...QUESTION,
      ladder: [
        { id: 'choice-1', description: 'Ad-hoc audits', points: 0, seal: 4 },
        { id: 'choice-2', description: 'Regular audits', points: 100, seal: 4 },
      ],
    });
    const options = optionsFor(unitClash('divergence', answered(2), answered(1)), flat);
    const cells = reanswerCells(options, flat);
    expect(cells.map((c) => c.position)).toEqual([1, 2]);
    expect(cells.map((c) => c.seal)).toEqual([4, 4]);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AssessmentSchema, WorkbookSchema } from '../schema';
import { evaluate } from '../score-engine';
import { workbookAssessmentOf } from '../setup';
import {
  checkPartial,
  finalizeLanded,
  isClash,
  land,
  optionsFor,
  reviewLanding,
  reviewSummary,
} from './index';

const readJson = (path: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), 'utf8'),
  );

const alex = AssessmentSchema.parse(readJson('samples/eu-csf-calculator-fill-alex.json'));
const jane = AssessmentSchema.parse(readJson('samples/eu-csf-calculator-fill-jane.json'));

const anchor = workbookAssessmentOf({
  workbook: alex.workbook,
  estate: alex.meta.estate,
  parties: alex.parties,
  id: alex.meta.workbookAssessment,
  createdAt: '2026-08-16T00:00:00.000Z',
});

describe('the EC calculator fills (instrument-S6)', () => {
  it('are partials against the same workbook-assessment', () => {
    expect(alex.meta.workbookAssessment).toBe(jane.meta.workbookAssessment);
    expect(checkPartial(anchor, alex)).toEqual({ ok: true });
    expect(checkPartial(anchor, jane)).toEqual({ ok: true });
  });

  it('Alex holds the source’s own score and floor', () => {
    const reading = evaluate(alex.workbook, alex);
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(67.9159004991755, 10);
    expect(reading.units).toEqual({
      total: 48,
      answered: 48,
      dontKnow: 0,
      na: 0,
      unanswered: 0,
    });
  });

  it('Jane’s four changes move the score and nothing else', () => {
    const reading = evaluate(jane.workbook, jane);
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(67.49917341765462, 10);
    expect(reading.units).toEqual({
      total: 48,
      answered: 46,
      dontKnow: 1,
      na: 1,
      unanswered: 0,
    });
  });

  const atBottomRung = (raw: unknown) => {
    const source = raw as { answers: { questionId: string; rungId?: string }[] };
    return {
      ...source,
      answers: source.answers.map((answer) =>
        answer.questionId === 'SOV-6.5' ? { ...answer, rungId: 'choice-1' } : answer,
      ),
    };
  };

  it('a ranking question drops the score and leaves the floor alone', () => {
    const lowered = AssessmentSchema.parse(
      atBottomRung(readJson('samples/eu-csf-calculator-fill-alex.json')),
    );
    const reading = evaluate(lowered.workbook, lowered);
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(67.1659004991755, 10);
  });

  it('the same answer on a material question would floor the estate at SEAL-0', () => {
    const raw = readJson('samples/eu-csf-calculator-fill-alex.json') as {
      workbook: {
        objectives: { questions: { id: string; defaultMateriality: string }[] }[];
      };
    };
    const workbook = WorkbookSchema.parse({
      ...raw.workbook,
      objectives: raw.workbook.objectives.map((objective) => ({
        ...objective,
        questions: objective.questions.map((question) =>
          question.id === 'SOV-6.5'
            ? { ...question, defaultMateriality: 'material' }
            : question,
        ),
      })),
    });
    const lowered = AssessmentSchema.parse({
      ...atBottomRung(raw),
      workbook,
    });
    const reading = evaluate(workbook, lowered);
    expect(reading.overall.floor).toBe(0);
    expect(reading.overall.score).toBeCloseTo(67.1659004991755, 10);
  });
});

describe('landing Alex then Jane', () => {
  const empty = { parties: anchor.parties, answers: [] };
  const questions = new Map(
    anchor.workbook.objectives.flatMap((o) => o.questions).map((q) => [q.id, q]),
  );

  const afterAlex = () => {
    const outcome = land(
      empty,
      [],
      alex,
      { resolutions: [], partyDecisions: [] },
      { id: 'L1', at: '2026-08-16T10:00:00.000Z', note: '' },
    );
    if (!outcome.ok) throw new Error('Alex failed to land');
    return outcome;
  };

  const janeReview = () => {
    const landed = afterAlex();
    return { landed, review: reviewLanding(landed.base, landed.ledger, jane, []) };
  };

  it('Alex lands 48 new units and no clash', () => {
    expect(reviewSummary(reviewLanding(empty, [], alex, []), [])).toEqual({
      answers: 48,
      newUnits: 48,
      clashes: 0,
      decided: 0,
      collisions: 0,
    });
  });

  it('Jane agrees 44 times and clashes 4', () => {
    const landed = afterAlex();
    expect(landed.ledger[0].records).toHaveLength(48);
    const review = reviewLanding(landed.base, landed.ledger, jane, []);
    expect(review.units.filter((u) => u.kind === 'agreed')).toHaveLength(44);
    expect(review.units.filter((u) => u.kind === 'sole-source')).toHaveLength(0);
    expect(reviewSummary(review, [])).toEqual({
      answers: 48,
      newUnits: 0,
      clashes: 4,
      decided: 0,
      collisions: 0,
    });
  });

  it('names the four clashes and their classes', () => {
    const { review } = janeReview();
    expect(
      review.units.filter(isClash).map((clash) => [clash.questionId, clash.clash]),
    ).toEqual([
      ['SOV-1.1', 'divergence'],
      ['SOV-1.2', 'divergence'],
      ['SOV-2.1', 'gap'],
      ['SOV-2.2', 'scope'],
    ]);
  });

  it('the same-SEAL divergence offers both rung texts', () => {
    const { review } = janeReview();
    const clash = review.units.filter(isClash).find((c) => c.questionId === 'SOV-1.2');
    if (clash === undefined) throw new Error('no SOV-1.2 clash');
    const question = questions.get('SOV-1.2');
    if (question === undefined) throw new Error('no SOV-1.2 question');
    expect(optionsFor(clash, question).slice(0, 2).map((option) => option.label)).toEqual([
      'Take Alex’s “Somewhat likely takeover by or transfer to a non-EU sovereign entity” (SEAL 4)',
      'Take Jane’s “Unlikely takeover by or transfer to a non-EU sovereign entity” (SEAL 4)',
    ]);
  });

  it('landing the queue on Alex’s answers returns the estate to the source reading', () => {
    const { landed, review } = janeReview();
    const resolutions = review.units.filter(isClash).map((clash) => ({
      questionId: clash.questionId,
      target: clash.target,
      choice: { kind: 'take' as const, from: 'Alex' },
      note: '',
    }));
    const outcome = land(
      landed.base,
      landed.ledger,
      jane,
      { resolutions, partyDecisions: [] },
      { id: 'L2', at: '2026-08-16T11:00:00.000Z', note: '' },
    );
    if (!outcome.ok) throw new Error('Jane failed to land');
    expect(outcome.ledger).toHaveLength(2);

    const finalized = finalizeLanded(anchor, outcome.base, outcome.ledger);
    const reading = evaluate(finalized.workbook, finalized);
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(67.9159004991755, 10);
    expect(reading.units).toEqual({
      total: 48,
      answered: 48,
      dontKnow: 0,
      na: 0,
      unanswered: 0,
    });
  });
});

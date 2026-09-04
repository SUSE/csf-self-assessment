import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Workbook } from '../schema';
import { testEstateReadings } from './estates';
import { ladderLint } from './lint';
import { euCsfCalculatorWorkbookRaw } from '../test-fixtures';

// instrument-S5: the imported EC calculator, pinned to its source readings. The
// two scores are quoted from spec §9 / §2.8 at four decimal places — they are
// the published numbers this conversion has to reproduce, which is why they live
// here and not in score-engine/checked-in-fixtures.test.ts, whose table pins
// full-precision doubles measured from our own fixtures.

const WB: Workbook = WorkbookSchema.parse(euCsfCalculatorWorkbookRaw);

const RANKING_QUESTION_IDS = ['SOV-3.5', 'SOV-5.1', 'SOV-5.2', 'SOV-5.3', 'SOV-6.5'];

function readingOf(workbook: Workbook, id: string) {
  const reading = testEstateReadings(workbook).find((r) => r.estateId === id);
  if (!reading) throw new Error(`missing reading ${id}`);
  return reading;
}

function idsWithFinding(workbook: Workbook, kind: string): string[] {
  return ladderLint(workbook)
    .filter((q) => q.findings.some((f) => f.kind === kind))
    .map((q) => q.questionId);
}

describe('the imported EC calculator (instrument-S5)', () => {
  it('is 8 objectives, 48 questions, 233 rungs and no dimensions', () => {
    const questions = WB.objectives.flatMap((o) => o.questions);
    expect(WB.objectives).toHaveLength(8);
    expect(questions).toHaveLength(48);
    expect(questions.flatMap((q) => q.ladder)).toHaveLength(233);
    expect(WB.dimensions).toEqual([]);
  });

  it('ships the two test estates, in order', () => {
    expect(testEstateReadings(WB).map((r) => r.estateId)).toEqual([
      'source-worked-example',
      'best-available-today',
    ]);
  });

  it('reads the source worked example at 67.9159% / SEAL-2', () => {
    const reading = readingOf(WB, 'source-worked-example');
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(67.9159, 4);
    expect(reading.units).toEqual({
      total: 48,
      answered: 47,
      dontKnow: 0,
      na: 0,
      unanswered: 1,
    });
  });

  it('reads the ceiling probe at 97.6786% / SEAL-4', () => {
    const reading = readingOf(WB, 'best-available-today');
    expect(reading.overall.floor).toBe(4);
    expect(reading.overall.score).toBeCloseTo(97.6786, 4);
    expect(reading.units).toEqual({
      total: 48,
      answered: 48,
      dontKnow: 0,
      na: 0,
      unanswered: 0,
    });
  });

  it('the ranking cap is real: making the five material costs a whole SEAL level', () => {
    const gated: Workbook = WorkbookSchema.parse({
      ...euCsfCalculatorWorkbookRaw,
      objectives: euCsfCalculatorWorkbookRaw.objectives.map((objective: { questions: { id: string }[] }) => ({
        ...objective,
        questions: objective.questions.map((question) =>
          RANKING_QUESTION_IDS.includes(question.id)
            ? { ...question, defaultMateriality: 'material' }
            : question,
        ),
      })),
    });
    const reading = readingOf(gated, 'best-available-today');
    expect(reading.overall.floor).toBe(3);
    expect(reading.overall.score).toBeCloseTo(97.6786, 4);
  });

  it('reports the source lint findings without repairing them', () => {
    expect(idsWithFinding(WB, 'flat-ladder')).toEqual([
      'SOV-1.2',
      'SOV-1.4',
      'SOV-1.5',
      'SOV-1.6',
      'SOV-1.7',
      'SOV-2.5',
      'SOV-5.3',
      'SOV-7.2',
      'SOV-8.4',
    ]);
    expect(idsWithFinding(WB, 'duplicate-rung-text')).toEqual([
      'SOV-8.2',
      'SOV-8.3',
      'SOV-8.4',
    ]);
    expect(idsWithFinding(WB, 'missing-why')).toEqual(['SOV-3.1', 'SOV-4.3']);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { Workbook } from '../schema';
import { testEstateReadings } from './estates';

// The deep-analysis variant of the imported EC calculator: the same instrument,
// asked across the guidance's nine technical dimensions and its chain of
// entities ("Depth of analysis", Implementation Guidance p12-13). The faithful
// import is pinned separately, and its own test asserts it stays grain-free.

const FILE = fileURLToPath(
  new URL('../../../../samples/eu-csf-calculator-deep-workbook.json', import.meta.url),
);
const WB: Workbook = WorkbookSchema.parse(JSON.parse(readFileSync(FILE, 'utf8')));

const QUESTIONS = WB.objectives.flatMap((o) => o.questions);

function readingOf(id: string) {
  const reading = testEstateReadings(WB).find((r) => r.estateId === id);
  if (!reading) throw new Error(`missing reading ${id}`);
  return reading;
}

describe('the deep-analysis EC calculator', () => {
  it('is the same 8 objectives, 48 questions and 233 rungs', () => {
    expect(WB.objectives).toHaveLength(8);
    expect(QUESTIONS).toHaveLength(48);
    expect(QUESTIONS.flatMap((q) => q.ladder)).toHaveLength(233);
  });

  it('asks 9 per party, 19 per dimension and 20 once for the estate', () => {
    const grains = QUESTIONS.map((q) =>
      q.grain === 'dimension' ? 'dimension' : q.axis === 'party' ? 'party' : 'assessment',
    );
    expect(grains.filter((g) => g === 'party')).toHaveLength(9);
    expect(grains.filter((g) => g === 'dimension')).toHaveLength(19);
    expect(grains.filter((g) => g === 'assessment')).toHaveLength(20);
  });

  it('applies every dimension question to declared dimensions only', () => {
    const declared = new Set(WB.dimensions.map((d) => d.id));
    expect(WB.dimensions).toHaveLength(9);
    for (const question of QUESTIONS) {
      if (question.grain !== 'dimension') continue;
      expect(question.appliesTo.every((id) => declared.has(id))).toBe(true);
    }
  });

  it('the fan-out turns 48 questions into 194 answer units', () => {
    expect(readingOf('best-available-today').units).toEqual({
      total: 194,
      answered: 194,
      dontKnow: 0,
      na: 0,
      unanswered: 0,
    });
  });

  it('holds the source worked example at its SEAL-2 floor', () => {
    const reading = readingOf('source-worked-example');
    expect(reading.overall.floor).toBe(2);
    expect(reading.overall.score).toBeCloseTo(69.6988, 4);
    expect(reading.units.unanswered).toBe(1);
  });

  it('keeps SEAL-4 reachable for the ceiling probe', () => {
    const reading = readingOf('best-available-today');
    expect(reading.overall.floor).toBe(4);
    expect(reading.overall.score).toBeCloseTo(98.9594, 4);
  });
});

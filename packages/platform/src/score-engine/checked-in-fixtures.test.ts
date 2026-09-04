import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { testEstateReadings } from '../author/estates';
import { AssessmentSchema, WorkbookAssessmentSchema, WorkbookSchema } from '../schema';
import { alexRaw, janeRaw, workbookAssessmentRaw, workbookRaw } from '../test-fixtures';
import { evaluate } from './index';

const units = (
  total: number,
  answered: number,
  dontKnow: number,
  na: number,
  unanswered: number,
) => ({ total, answered, dontKnow, na, unanswered });

type UnitCounts = ReturnType<typeof units>;
type ReadingExpectation = [string, number, number, UnitCounts];
type WorkbookCase = { file: string; readings: ReadingExpectation[] };

const readJson = (path: string) => {
  if (path === 'assessment/partial-Alex.json') return alexRaw;
  if (path === 'assessment/partial-Jane.json') return janeRaw;
  if (path === 'assessment/workbook-assessment.json') return workbookAssessmentRaw;
  if (path === 'assessment/workbook.json') return workbookRaw;
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../../${path}`, import.meta.url)), 'utf8'),
  );
};

describe('checked-in assessments', () => {
  const cases = [
    {
      file: 'assessment/partial-Alex.json',
      floor: 1,
      score: 40.8558402585411,
      answered: 28,
      total: 35,
      units: units(63, 56, 1, 6, 0),
      heatmapLength: 21,
      binding: [
        'SOV-1.concentration',
        'SOV-4.withdrawal-survival',
        'SOV-4.patch-autonomy',
        'SOV-5.hardware-provenance',
        'SOV-6.fork-continuation',
        'SOV-6.exit-rehearsal',
        'SOV-6.independent-build',
      ],
      unknowns: ['SOV-5.hardware-provenance'],
    },
    {
      file: 'assessment/partial-Jane.json',
      floor: 0,
      score: 17.25563909774436,
      answered: 14,
      total: 35,
      units: units(66, 36, 3, 7, 20),
      heatmapLength: 14,
      binding: [
        'SOV-1.concentration',
        'SOV-3.key-custody',
        'SOV-4.withdrawal-survival',
        'SOV-6.exit-rehearsal',
        'SOV-7.iam-authority',
      ],
      unknowns: [
        'SOV-3.data-residency',
        'SOV-4.withdrawal-survival',
        'SOV-5.hardware-provenance',
      ],
    },
    {
      file: 'samples/teaching-deep-analysis-assessment.json',
      floor: 0,
      score: 44.25,
      answered: 9,
      total: 11,
      units: units(24, 22, 1, 0, 1),
      heatmapLength: 8,
      binding: ['DEEP-TEC.layer-control'],
      unknowns: ['DEEP-TEC.paas-control'],
    },
  ];

  for (const expected of cases) {
    it(expected.file, () => {
      const assessment = AssessmentSchema.parse(readJson(expected.file));
      const result = evaluate(assessment.workbook, assessment);

      expect(result.overall.floor).toBe(expected.floor);
      expect(result.overall.score).toBeCloseTo(expected.score, 10);
      expect(result.overall.answered).toBe(expected.answered);
      expect(result.overall.total).toBe(expected.total);
      expect(result.units).toEqual(expected.units);
      expect(result.heatmap).toHaveLength(expected.heatmapLength);
      expect(result.overall.binding).toEqual(expected.binding);
      expect(result.overall.unknowns).toEqual(expected.unknowns);
    });
  }
});

describe('checked-in workbooks', () => {
  const cases: WorkbookCase[] = [
    {
      file: 'samples/csf-workbook.json',
      readings: [
        ['profile-a', 0, 31.180555555555557, units(68, 67, 0, 0, 1)],
        ['profile-base', 1, 73.00073099415204, units(68, 67, 0, 0, 1)],
        ['profile-m', 0, 23.190789473684212, units(68, 67, 0, 0, 1)],
      ],
    },
    { file: 'samples/sample-workbook.json', readings: [] },
    {
      file: 'samples/teaching-workbook.json',
      readings: [
        ['teach-median', 1, 38.88888888888889, units(10, 10, 0, 0, 0)],
        ['teach-hyperscaler', 0, 18.75, units(9, 9, 0, 0, 0)],
        ['teach-sovereign', 1, 71.875, units(9, 8, 0, 0, 1)],
      ],
    },
    {
      file: 'samples/teaching-deep-analysis-workbook.json',
      readings: [
        ['deep-one-roof', 0, 5.681818181818182, units(14, 14, 0, 0, 0)],
        ['deep-layered', 1, 42.04545454545455, units(16, 16, 0, 0, 0)],
        ['deep-sovereign-ceiling', 2, 73.4090909090909, units(15, 15, 0, 0, 0)],
      ],
    },
    {
      file: 'assessment/workbook.json',
      readings: [
        ['profile-a', 0, 14.479166666666668, units(63, 63, 0, 0, 0)],
        ['profile-base', 1, 68.44977025898079, units(69, 66, 0, 0, 3)],
        ['profile-m', 1, 35.61116332497911, units(75, 75, 0, 0, 0)],
      ],
    },
  ];

  for (const expected of cases) {
    it(expected.file, () => {
      const workbook = WorkbookSchema.parse(readJson(expected.file));
      const readings = testEstateReadings(workbook);

      expect(readings).toHaveLength(expected.readings.length);
      readings.forEach((reading, i) => {
        const expectedReading = expected.readings[i];
        expect(reading.estateId).toBe(expectedReading[0]);
        expect(reading.overall.floor).toBe(expectedReading[1]);
        expect(reading.overall.score).toBeCloseTo(expectedReading[2], 10);
        expect(reading.units).toEqual(expectedReading[3]);
      });
    });
  }
});

describe('checked-in workbook-assessments', () => {
  const files = [
    'samples/teaching-workbook-assessment.json',
    'samples/teaching-deep-analysis-workbook-assessment.json',
    'assessment/workbook-assessment.json',
  ];

  for (const file of files) {
    it(file, () => {
      const assessment = WorkbookAssessmentSchema.parse(readJson(file));
      expect(assessment.workbook.objectives.length).toBeGreaterThan(0);
    });
  }
});

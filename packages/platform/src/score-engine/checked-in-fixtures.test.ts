import { describe, expect, it } from 'vitest';
import { testEstateReadings } from '../author/estates';
import { AssessmentSchema, WorkbookAssessmentSchema, WorkbookSchema } from '../schema';
import {
  alexRaw,
  csfWorkbookRaw,
  janeRaw,
  sampleWorkbookRaw,
  teachingDeepAnalysisAssessmentRaw,
  teachingDeepAnalysisWorkbookAssessmentRaw,
  teachingDeepAnalysisWorkbookRaw,
  teachingWorkbookAssessmentRaw,
  teachingWorkbookRaw,
  workbookAssessmentRaw,
  workbookRaw,
} from '../test-fixtures';
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

describe('checked-in assessments', () => {
  it('test fixture: alexRaw', () => {
    const assessment = AssessmentSchema.parse(alexRaw);
    const result = evaluate(assessment.workbook, assessment);

    expect(result.overall.floor).toBe(1);
    expect(result.overall.score).toBeCloseTo(40.8558402585411, 10);
    expect(result.overall.answered).toBe(28);
    expect(result.overall.total).toBe(35);
    expect(result.units).toEqual(units(63, 56, 1, 6, 0));
    expect(result.heatmap).toHaveLength(21);
    expect(result.overall.binding).toEqual([
      'SOV-1.concentration',
      'SOV-4.withdrawal-survival',
      'SOV-4.patch-autonomy',
      'SOV-5.hardware-provenance',
      'SOV-6.fork-continuation',
      'SOV-6.exit-rehearsal',
      'SOV-6.independent-build',
    ]);
    expect(result.overall.unknowns).toEqual(['SOV-5.hardware-provenance']);
  });

  it('test fixture: janeRaw', () => {
    const assessment = AssessmentSchema.parse(janeRaw);
    const result = evaluate(assessment.workbook, assessment);

    expect(result.overall.floor).toBe(0);
    expect(result.overall.score).toBeCloseTo(17.25563909774436, 10);
    expect(result.overall.answered).toBe(14);
    expect(result.overall.total).toBe(35);
    expect(result.units).toEqual(units(66, 36, 3, 7, 20));
    expect(result.heatmap).toHaveLength(14);
    expect(result.overall.binding).toEqual([
      'SOV-1.concentration',
      'SOV-3.key-custody',
      'SOV-4.withdrawal-survival',
      'SOV-6.exit-rehearsal',
      'SOV-7.iam-authority',
    ]);
    expect(result.overall.unknowns).toEqual([
      'SOV-3.data-residency',
      'SOV-4.withdrawal-survival',
      'SOV-5.hardware-provenance',
    ]);
  });

  it('test fixture: teachingDeepAnalysisAssessmentRaw', () => {
    const assessment = AssessmentSchema.parse(teachingDeepAnalysisAssessmentRaw);
    const result = evaluate(assessment.workbook, assessment);

    expect(result.overall.floor).toBe(0);
    expect(result.overall.score).toBeCloseTo(44.25, 10);
    expect(result.overall.answered).toBe(9);
    expect(result.overall.total).toBe(11);
    expect(result.units).toEqual(units(24, 22, 1, 0, 1));
    expect(result.heatmap).toHaveLength(8);
    expect(result.overall.binding).toEqual(['DEEP-TEC.layer-control']);
    expect(result.overall.unknowns).toEqual(['DEEP-TEC.paas-control']);
  });
});

describe('checked-in workbooks', () => {
  const cases = [
    {
      name: 'test fixture: csfWorkbookRaw',
      raw: csfWorkbookRaw,
      readings: [
        ['profile-a', 0, 31.180555555555557, units(68, 67, 0, 0, 1)] as ReadingExpectation,
        ['profile-base', 1, 73.00073099415204, units(68, 67, 0, 0, 1)] as ReadingExpectation,
        ['profile-m', 0, 23.190789473684212, units(68, 67, 0, 0, 1)] as ReadingExpectation,
      ],
    },
    { name: 'test fixture: sampleWorkbookRaw', raw: sampleWorkbookRaw, readings: [] as ReadingExpectation[] },
    {
      name: 'test fixture: teachingWorkbookRaw',
      raw: teachingWorkbookRaw,
      readings: [
        ['teach-median', 1, 38.88888888888889, units(10, 10, 0, 0, 0)] as ReadingExpectation,
        ['teach-hyperscaler', 0, 18.75, units(9, 9, 0, 0, 0)] as ReadingExpectation,
        ['teach-sovereign', 1, 71.875, units(9, 8, 0, 0, 1)] as ReadingExpectation,
      ],
    },
    {
      name: 'test fixture: teachingDeepAnalysisWorkbookRaw',
      raw: teachingDeepAnalysisWorkbookRaw,
      readings: [
        ['deep-one-roof', 0, 5.681818181818182, units(14, 14, 0, 0, 0)] as ReadingExpectation,
        ['deep-layered', 1, 42.04545454545455, units(16, 16, 0, 0, 0)] as ReadingExpectation,
        ['deep-sovereign-ceiling', 2, 73.4090909090909, units(15, 15, 0, 0, 0)] as ReadingExpectation,
      ],
    },
  ];

  for (const expected of cases) {
    it(expected.name, () => {
      const workbook = WorkbookSchema.parse(expected.raw);
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

  it('test fixture: workbookRaw', () => {
    const workbook = WorkbookSchema.parse(workbookRaw);
    const readings = testEstateReadings(workbook);

    expect(readings).toHaveLength(3);
    const expectations = [
      ['profile-a', 0, 14.479166666666668, units(63, 63, 0, 0, 0)],
      ['profile-base', 1, 68.44977025898079, units(69, 66, 0, 0, 3)],
      ['profile-m', 1, 35.61116332497911, units(75, 75, 0, 0, 0)],
    ];
    readings.forEach((reading, i) => {
      const expectedReading = expectations[i];
      expect(reading.estateId).toBe(expectedReading[0]);
      expect(reading.overall.floor).toBe(expectedReading[1]);
      expect(reading.overall.score).toBeCloseTo(expectedReading[2] as number, 10);
      expect(reading.units).toEqual(expectedReading[3]);
    });
  });
});

describe('checked-in workbook-assessments', () => {
  const cases = [
    { name: 'test fixture: teachingWorkbookAssessmentRaw', raw: teachingWorkbookAssessmentRaw },
    { name: 'test fixture: teachingDeepAnalysisWorkbookAssessmentRaw', raw: teachingDeepAnalysisWorkbookAssessmentRaw },
  ];

  for (const expected of cases) {
    it(expected.name, () => {
      const assessment = WorkbookAssessmentSchema.parse(expected.raw);
      expect(assessment.workbook.objectives.length).toBeGreaterThan(0);
    });
  }

  it('test fixture: workbookAssessmentRaw', () => {
    const assessment = WorkbookAssessmentSchema.parse(workbookAssessmentRaw);
    expect(assessment.workbook.objectives.length).toBeGreaterThan(0);
  });
});

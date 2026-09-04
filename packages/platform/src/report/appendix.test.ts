import { describe, expect, it } from 'vitest';
import { SUBJECT_C, SUBJECT_EMPTY } from '../analytics/subjects-fixture';
import { WorkbookSchema } from '../schema';
import { AUTHOR_QA_PROVENANCE, answerFor, assessmentOf } from '../assessment';
import { evaluate } from '../score-engine';
import type { AppendixObjective, AppendixQuestion, AppendixRow } from './appendix';
import { reportAppendix } from './appendix';

type Appendix = AppendixObjective[];

function questionOf(appendix: Appendix, objectiveId: string, questionId: string): AppendixQuestion {
  const question = appendix
    .find((objective) => objective.id === objectiveId)
    ?.questions.find((candidate) => candidate.questionId === questionId);
  if (question === undefined) throw new Error(`missing appendix question ${questionId}`);
  return question;
}

function rowOf(question: AppendixQuestion, targetLabel: string): AppendixRow {
  const row = question.rows.find((candidate) => candidate.targetLabel === targetLabel);
  if (row === undefined) throw new Error(`missing appendix row ${targetLabel}`);
  return row;
}

function workbookQuestionText(objectiveId: string, questionId: string): string {
  const question = SUBJECT_C.workbook.objectives
    .find((objective) => objective.id === objectiveId)
    ?.questions.find((candidate) => candidate.id === questionId);
  if (question === undefined) throw new Error(`missing workbook question ${questionId}`);
  return question.text;
}

describe('the Report appendix', () => {
  it('every unit of the estate is transcribed, in the instrument’s own order', () => {
    const { assessment, result } = SUBJECT_C;
    const appendix = reportAppendix(assessment, result);
    const questions = appendix.flatMap((objective) => objective.questions);
    const rows = questions.flatMap((question) => question.rows);

    expect(appendix.map((objective) => objective.id)).toEqual([
      'SOV-1',
      'SOV-2',
      'SOV-3',
      'SOV-4',
      'SOV-5',
      'SOV-6',
      'SOV-7',
      'SOV-8',
    ]);
    expect(questions).toHaveLength(35);
    expect(rows.filter((row) => row.state === 'answered')).toHaveLength(result.units.answered);
    expect(rows.filter((row) => row.state === 'dont-know')).toHaveLength(result.units.dontKnow);
    expect(rows.filter((row) => row.state === 'na')).toHaveLength(result.units.na);
    expect(rows.filter((row) => row.state === 'unanswered')).toHaveLength(result.units.unanswered);
  });

  it('a question carries its authored role and materiality, once', () => {
    const appendix = reportAppendix(SUBJECT_C.assessment, SUBJECT_C.result);
    const compel = questionOf(appendix, 'SOV-2', 'SOV-2.compellability');
    const circularity = questionOf(appendix, 'SOV-8', 'SOV-8.hardware-circularity');

    expect(compel.roleName).toBe('Legal');
    expect(compel.materiality).toBe('material');
    expect(compel.questionText).toBe(
      workbookQuestionText('SOV-2', 'SOV-2.compellability'),
    );
    expect(circularity.materiality).toBe('informational');
  });

  it('carries ranking through to the transcript', () => {
    const workbook = structuredClone(SUBJECT_C.assessment.workbook);
    for (const objective of workbook.objectives) {
      for (const question of objective.questions) {
        if (question.id === 'SOV-8.hardware-circularity') question.defaultMateriality = 'ranking';
      }
    }
    const assessment = { ...SUBJECT_C.assessment, workbook };
    const appendix = reportAppendix(assessment, evaluate(workbook, assessment));

    expect(questionOf(appendix, 'SOV-8', 'SOV-8.hardware-circularity').materiality).toBe('ranking');
  });

  it('asserted units come first, then the open ones', () => {
    const appendix = reportAppendix(SUBJECT_C.assessment, SUBJECT_C.result);
    const rows = questionOf(appendix, 'SOV-1', 'SOV-1.change-of-control').rows;

    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 5).every((row) => row.state !== 'unanswered')).toBe(true);
    expect(rows[5]).toMatchObject({
      state: 'unanswered',
      targetLabel: 'Northstar Edge Networks',
    });
  });

  it('the evidence note is the prose the participant typed', () => {
    const rows = questionOf(
      reportAppendix(SUBJECT_C.assessment, SUBJECT_C.result),
      'SOV-2',
      'SOV-2.compellability',
    );
    const acmeEu = rowOf(rows, 'Acme Cloud EU');
    const acmeSas = rowOf(rows, 'Acme Cloud Europe SAS');

    expect(acmeEu).toMatchObject({
      state: 'answered',
      seal: 1,
      placement: 'individual',
      label:
        '“An EU entity signs the contract; its non-EU parent remains subject to foreign orders that reach your data.” (SEAL 1)',
      reason: null,
      evidence:
        'External counsel memo on extraterritorial disclosure exposure, January 2026.',
    });
    expect(acmeSas).toMatchObject({
      state: 'answered',
      seal: 0,
      evidence:
        'Parent-company transparency report and outside-counsel note, April 2026.',
    });
  });

  it('an n/a carries its exclusion reason, a don’t-know carries neither', () => {
    const appendix = reportAppendix(SUBJECT_C.assessment, SUBJECT_C.result);
    const institution = rowOf(
      questionOf(appendix, 'SOV-1', 'SOV-1.decisive-authority'),
      'The institution',
    );
    const dontKnow = rowOf(
      questionOf(appendix, 'SOV-2', 'SOV-2.enforceability'),
      'Acme Cloud Europe SAS',
    );

    expect(institution).toMatchObject({
      state: 'na',
      seal: null,
      label: 'n/a',
      evidence: null,
      reason: 'The assessed institution itself — this question targets its third parties.',
    });
    expect(dontKnow).toMatchObject({
      state: 'dont-know',
      seal: null,
      label: 'don’t know',
      evidence: null,
      reason: null,
    });
  });

  it('nothing answered still transcribes every unit', () => {
    const appendix = reportAppendix(SUBJECT_EMPTY.assessment, SUBJECT_EMPTY.result);
    const questions = appendix.flatMap((objective) => objective.questions);
    const rows = questions.flatMap((question) => question.rows);

    expect(appendix).toHaveLength(8);
    expect(questions).toHaveLength(35);
    expect(rows).toHaveLength(57);
    rows.forEach((row) => {
      expect(row).toMatchObject({
        state: 'unanswered',
        seal: null,
        placement: null,
        evidence: null,
        reason: null,
        label: 'unanswered',
      });
    });
  });

  it('names the rung, so two rungs at one SEAL do not read alike', () => {
    const workbook = WorkbookSchema.parse({
      meta: { id: 'flat', version: '1.0.0', title: 'Flat' },
      sealLevels: [{ seal: 4, name: 'S4', description: 'd4' }],
      roles: [{ id: 'ARCH', name: 'Architecture' }],
      parties: [{ id: 'institution', name: 'Institution', kind: 'assessed' }],
      dimensions: [
        { id: 'compute', name: 'Compute', critical: true },
        { id: 'network', name: 'Network', critical: true },
      ],
      objectives: [
        {
          id: 'SOV-9',
          name: 'Flat',
          weight: 100,
          questions: [
            {
              id: 'SOV-9.flat',
              grain: 'dimension',
              appliesTo: ['compute', 'network'],
              text: 'q?',
              why: 'b',
              role: 'ARCH',
              defaultMateriality: 'material',
              ladder: [
                { id: 'choice-1', description: 'Ad-hoc audits', points: 0, seal: 4 },
                { id: 'choice-2', description: 'Regular audits', points: 100, seal: 4 },
              ],
            },
          ],
        },
      ],
    });
    const G = { groupId: 'g1', placement: 'individual' as const };
    const answers = [
      answerFor('SOV-9.flat', { kind: 'dimension', dimension: 'compute' }, { state: 'answered', rungId: 'choice-1' }, G),
      answerFor('SOV-9.flat', { kind: 'dimension', dimension: 'network' }, { state: 'answered', rungId: 'choice-2' }, G),
    ];
    const assessment = assessmentOf(workbook, 'flat', [], answers, AUTHOR_QA_PROVENANCE);
    const appendix = reportAppendix(assessment, evaluate(workbook, assessment));
    const rows = questionOf(appendix, 'SOV-9', 'SOV-9.flat').rows;

    expect(rows.map((row) => row.label)).toEqual([
      '“Ad-hoc audits” (SEAL 4)',
      '“Regular audits” (SEAL 4)',
    ]);
    expect(rows.every((row) => row.seal === 4)).toBe(true);
  });

  it('the appendix aggregates nothing', () => {
    const { assessment, result } = SUBJECT_C;
    const appendix = reportAppendix(assessment, result);
    const questions = appendix.flatMap((objective) => objective.questions);
    const rows = questions.flatMap((question) => question.rows);

    appendix.forEach((objective) => {
      expect(Object.keys(objective).sort()).toEqual(['id', 'name', 'questions']);
    });
    questions.forEach((question) => {
      expect(Object.keys(question).sort()).toEqual([
        'materiality',
        'questionId',
        'questionText',
        'roleName',
        'rows',
      ]);
    });
    rows.forEach((row) => {
      expect(Object.keys(row).sort()).toEqual([
        'evidence',
        'label',
        'placement',
        'reason',
        'seal',
        'state',
        'targetLabel',
      ]);
    });

    const appendixSeals = rows
      .map((row) => row.seal)
      .filter((seal): seal is NonNullable<typeof seal> => seal !== null)
      .sort((left, right) => left - right);
    const engineSeals = result.facts
      .map((fact) => fact.seal)
      .filter((seal): seal is NonNullable<typeof seal> => seal !== null)
      .sort((left, right) => left - right);
    expect(appendixSeals).toEqual(engineSeals);

    JSON.stringify(appendix, (key, value) => {
      if (typeof value === 'number') expect(key).toBe('seal');
      return value;
    });
  });
});

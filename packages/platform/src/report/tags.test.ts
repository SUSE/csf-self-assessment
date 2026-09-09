import { describe, expect, it } from 'vitest';
import { SUBJECT_A } from '../analytics/subjects-fixture';
import type { ReportStamp } from './document';
import { reportDocument } from './document';
import { questionTags, reportTag } from './tags';

const BERLIN: ReportStamp = {
  generatedAt: '2026-08-14T09:30:00.000Z',
  viewer: { locale: 'en-GB', zone: 'Europe/Berlin' },
};

describe('the printed cross-reference', () => {
  it('a climb tag names its floor and wears it; the others carry no seal', () => {
    expect(reportTag({ kind: 'staircase', floor: 2 })).toEqual({
      key: 'staircase:2',
      label: '#CLIMB-2',
      family: 'staircase',
      seal: 2,
    });
    expect(reportTag({ kind: 'evidence' }).label).toBe('#EVID');
    expect(reportTag({ kind: 'evidence' }).seal).toBeNull();
    expect(reportTag({ kind: 'dont-know' }).label).toBe('#DK');
    expect(reportTag({ kind: 'second-look', index: 3 }).label).toBe('#LOOK-3');
  });

  it('a question in two lists carries both tags, once each', () => {
    const tags = questionTags([
      { owner: { kind: 'evidence' }, questionIds: ['q1', 'q2'] },
      { owner: { kind: 'dont-know' }, questionIds: ['q1'] },
      { owner: { kind: 'evidence' }, questionIds: ['q1'] },
    ]);

    expect(tags.q1?.map((t) => t.label)).toEqual(['#EVID', '#DK']);
    expect(tags.q2?.map((t) => t.label)).toEqual(['#EVID']);
  });

  it('every question a body list named is tagged — the tail included', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    const tagged = doc.questionTags;

    for (const section of doc.sections) {
      for (const reading of section.readings) {
        if (reading.id !== 'evidence' || reading.model.kind !== 'covered') continue;
        expect(reading.model.undefended.length).toBeGreaterThan(0);
        for (const row of reading.model.undefended) {
          expect(tagged[row.questionId]?.map((t) => t.label)).toContain('#EVID');
        }
      }
    }
  });

  it('every tagged question is in the transcript, or the badge points nowhere', () => {
    const doc = reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);
    const transcribed = new Set(
      doc.appendix.flatMap((objective) => objective.questions.map((q) => q.questionId)),
    );

    expect(Object.keys(doc.questionTags).length).toBeGreaterThan(0);
    for (const questionId of Object.keys(doc.questionTags)) {
      expect(transcribed).toContain(questionId);
    }
  });
});

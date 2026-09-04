import type { ZodIssue } from 'zod';
import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../../schema';
import type { Objective, Question, Workbook } from '../../schema';
import {
  firstFocus,
  focusForIssue,
  focusKey,
  isFocusRef,
  objectiveSite,
  questionSite,
  recommendationSite,
  resolveFocus,
  sameFocus,
  sectionFocus,
  stageOrder,
} from './focus';
import type { FocusRef } from './focus';

// Minimal drafts — the focus helpers read only objectives/questions ids, so
// tests build just that shape rather than a full strict workbook.
function draftOf(
  objectives: { id: string; questions: string[] }[],
  recommendations: string[] = ['rec-1', 'rec-2'],
): Workbook {
  return {
    objectives: objectives.map((o) => ({
      id: o.id,
      name: o.id,
      weight: 0,
      questions: o.questions.map((id) => ({ id })),
    })),
    recommendations: recommendations.map((id) => ({ id })),
  } as unknown as Workbook;
}

function issue(path: (string | number)[]): ZodIssue {
  return { code: 'custom', path, message: '' } as unknown as ZodIssue;
}

describe('firstFocus', () => {
  it('opens on the first objective’s first question', () => {
    const draft = draftOf([
      { id: 'obj-1', questions: ['q-1', 'q-2'] },
      { id: 'obj-2', questions: ['q-3'] },
    ]);
    expect(firstFocus(draft)).toEqual({ kind: 'question', id: 'q-1' });
  });

  it('falls back to the objective when it has no questions', () => {
    const draft = draftOf([{ id: 'obj-1', questions: [] }]);
    expect(firstFocus(draft)).toEqual({ kind: 'objective', id: 'obj-1' });
  });

  it('falls back to overview when there are no objectives', () => {
    const draft = draftOf([]);
    expect(firstFocus(draft)).toEqual({ kind: 'overview' });
  });
});

describe('focusForIssue', () => {
  const draft = draftOf([
    { id: 'obj-1', questions: ['q-1', 'q-2'] },
    { id: 'obj-2', questions: ['q-3'] },
  ]);

  it('routes a question-path issue to that question’s id', () => {
    expect(focusForIssue(draft, issue(['objectives', 1, 'questions', 0, 'ladder']))).toEqual({
      kind: 'question',
      id: 'q-3',
    });
  });

  it('routes an objective-path issue (not under questions) to that objective’s id', () => {
    expect(focusForIssue(draft, issue(['objectives', 0, 'weight']))).toEqual({
      kind: 'objective',
      id: 'obj-1',
    });
  });

  it('routes instrument-section issues to their section', () => {
    expect(focusForIssue(draft, issue(['dimensions', 0, 'id']))).toEqual({ kind: 'dimensions' });
    expect(focusForIssue(draft, issue(['roles', 0, 'id']))).toEqual({ kind: 'roles' });
    expect(focusForIssue(draft, issue(['parties', 0, 'kind']))).toEqual({ kind: 'parties' });
    expect(focusForIssue(draft, issue(['frontSheet', 0]))).toEqual({ kind: 'frontSheet' });
    expect(focusForIssue(draft, issue(['testEstates', 0, 'answers']))).toEqual({ kind: 'testEstates' });
    expect(focusForIssue(draft, issue(['recommendations']))).toEqual({
      kind: 'recommendations',
    });
    expect(focusForIssue(draft, issue(['recommender']))).toEqual({ kind: 'recommendations' });
  });

  it('routes a recommendation-path issue to that recommendation’s id', () => {
    expect(focusForIssue(draft, issue(['recommendations', 1, 'links']))).toEqual({
      kind: 'recommendation',
      id: 'rec-2',
    });
  });

  it('routes an issue naming a gone recommendation to the catalogue list', () => {
    expect(focusForIssue(draft, issue(['recommendations', 9, 'links']))).toEqual({
      kind: 'recommendations',
    });
  });

  it('routes meta, sealLevels, and top-level refinements to overview', () => {
    expect(focusForIssue(draft, issue(['meta', 'id']))).toEqual({ kind: 'overview' });
    expect(focusForIssue(draft, issue(['sealLevels']))).toEqual({ kind: 'overview' });
    expect(focusForIssue(draft, issue([]))).toEqual({ kind: 'overview' });
    expect(focusForIssue(draft, issue(['objectives']))).toEqual({ kind: 'overview' });
  });
});

describe('resolveFocus', () => {
  const draft = draftOf([
    { id: 'obj-1', questions: ['q-1', 'q-2'] },
    { id: 'obj-2', questions: ['q-3'] },
  ]);

  it('passes through a focus whose target still exists', () => {
    expect(resolveFocus(draft, { kind: 'question', id: 'q-3' })).toEqual({ kind: 'question', id: 'q-3' });
    expect(resolveFocus(draft, { kind: 'objective', id: 'obj-2' })).toEqual({ kind: 'objective', id: 'obj-2' });
  });

  it('falls back to firstFocus when the focused question was removed', () => {
    expect(resolveFocus(draft, { kind: 'question', id: 'gone' })).toEqual({ kind: 'question', id: 'q-1' });
  });

  it('falls back to firstFocus when the focused objective was removed', () => {
    expect(resolveFocus(draft, { kind: 'objective', id: 'gone' })).toEqual({ kind: 'question', id: 'q-1' });
  });

  it('passes a live recommendation through, and falls back to its LIST when removed', () => {
    expect(resolveFocus(draft, { kind: 'recommendation', id: 'rec-2' })).toEqual({
      kind: 'recommendation',
      id: 'rec-2',
    });
    expect(resolveFocus(draft, { kind: 'recommendation', id: 'gone' })).toEqual({
      kind: 'recommendations',
    });
  });

  it('always passes instrument-section focuses through', () => {
    for (const kind of ['overview', 'frontSheet', 'dimensions', 'roles', 'parties', 'testEstates', 'recommendations'] as const) {
      expect(resolveFocus(draft, { kind })).toEqual({ kind });
    }
  });

  it('falls back to firstFocus for a stale/foreign non-FocusRef focus', () => {
    // A persisted focus written by a sibling app or an older build (see
    // view-history.ts) can reach resolveFocus in the wrong shape — it must not crash.
    for (const junk of [undefined, null, {}, { stage: 'empty' }, { kind: 'objective' }, 'q-1']) {
      expect(resolveFocus(draft, junk as unknown as FocusRef)).toEqual({ kind: 'question', id: 'q-1' });
    }
  });
});

describe('isFocusRef', () => {
  it('accepts every instrument-section kind', () => {
    for (const kind of ['overview', 'frontSheet', 'objectives', 'questions', 'dimensions', 'roles', 'parties', 'testEstates', 'recommendations'] as const) {
      expect(isFocusRef({ kind })).toBe(true);
    }
  });

  it('accepts objective/question/recommendation focuses carrying a string id', () => {
    expect(isFocusRef({ kind: 'objective', id: 'obj-1' })).toBe(true);
    expect(isFocusRef({ kind: 'question', id: 'q-1' })).toBe(true);
    expect(isFocusRef({ kind: 'recommendation', id: 'rec-1' })).toBe(true);
  });

  it('rejects non-objects and unknown/missing kinds', () => {
    for (const junk of [undefined, null, 'overview', 42, {}, { kind: 'nope' }, { stage: 'empty' }]) {
      expect(isFocusRef(junk)).toBe(false);
    }
  });

  it('rejects objective/question/recommendation focuses without a string id', () => {
    expect(isFocusRef({ kind: 'objective' })).toBe(false);
    expect(isFocusRef({ kind: 'question', id: 7 })).toBe(false);
    expect(isFocusRef({ kind: 'recommendation' })).toBe(false);
  });
});

describe('sameFocus', () => {
  it('two focuses of the same kind and id name the same place', () => {
    expect(sameFocus({ kind: 'recommendations' }, { kind: 'recommendations' })).toBe(true);
    expect(
      sameFocus({ kind: 'recommendation', id: 'rec-1' }, { kind: 'recommendation', id: 'rec-1' }),
    ).toBe(true);
  });

  it('a different kind or a different id is a different place', () => {
    expect(sameFocus({ kind: 'recommendations' }, { kind: 'recommendation', id: 'rec-1' })).toBe(
      false,
    );
    expect(
      sameFocus({ kind: 'recommendation', id: 'rec-1' }, { kind: 'recommendation', id: 'rec-2' }),
    ).toBe(false);
    expect(sameFocus({ kind: 'question', id: 'q-1' }, { kind: 'objective', id: 'q-1' })).toBe(false);
  });
});

describe('sectionFocus', () => {
  it('maps every instrument section to its fieldless focus', () => {
    expect(sectionFocus('objectives')).toEqual({ kind: 'objectives' });
    expect(sectionFocus('dimensions')).toEqual({ kind: 'dimensions' });
    expect(sectionFocus('parties')).toEqual({ kind: 'parties' });
    expect(sectionFocus('roles')).toEqual({ kind: 'roles' });
    expect(sectionFocus('testEstates')).toEqual({ kind: 'testEstates' });
  });
});

// The stage lookups read real objectives, questions and recommendations, so this
// draft is the sample workbook plus one recommendation, parsed — no cast, and a
// shape slip fails loudly at parse time. The objectives stay whole: the strict
// refinements tie weights and test-estate answers to the full set.
import { csfWorkbookRaw } from '../../test-fixtures';

const FULL = WorkbookSchema.parse(csfWorkbookRaw);
const STAGE_DRAFT: Workbook = WorkbookSchema.parse({
  ...FULL,
  recommender: { name: 'A vendor', disclosure: 'Vendor-authored content.' },
  recommendations: [
    {
      id: 'rec-sovereign-exit',
      title: 'Rehearse the exit',
      action: 'Run a restore from the exported bundle once a quarter.',
      links: [{ kind: 'dimension', id: 'compute' }],
      whenAtOrBelow: 2,
      horizon: 'renewal',
      order: 0,
    },
  ],
});

function objectiveAt(index: number): Objective {
  const found = STAGE_DRAFT.objectives[index];
  if (!found) throw new Error(`no objective ${index}`);
  return found;
}
function questionAt(objectiveIndex: number, index: number): Question {
  const found = objectiveAt(objectiveIndex).questions[index];
  if (!found) throw new Error(`no question ${objectiveIndex}/${index}`);
  return found;
}

describe('focusKey', () => {
  it('is the kind alone for a section and kind:id for a content target', () => {
    expect(focusKey({ kind: 'overview' })).toBe('overview');
    expect(focusKey({ kind: 'question', id: 'q2' })).toBe('question:q2');
  });
});

describe('stageOrder', () => {
  it('is the header icon row left to right, sections then walk then destinations', () => {
    const objectives = STAGE_DRAFT.objectives;
    expect(stageOrder(STAGE_DRAFT, ['dashboard'])).toEqual([
      'overview',
      'frontSheet',
      'objectives',
      'dimensions',
      'roles',
      'parties',
      'recommendations',
      'recommendation:rec-sovereign-exit',
      'testEstates',
      'questions',
      ...objectives.flatMap((o) => [
        `objective:${o.id}`,
        ...o.questions.map((q) => `question:${q.id}`),
      ]),
      'stage:dashboard',
    ]);
  });
});

describe('questionSite / objectiveSite / recommendationSite', () => {
  it('locates a question with the indices the strict-issue path needs', () => {
    const site = questionSite(STAGE_DRAFT, questionAt(0, 1).id);
    expect(site).toEqual({
      objective: objectiveAt(0),
      question: questionAt(0, 1),
      objectiveIndex: 0,
      questionIndex: 1,
    });
    expect(questionSite(STAGE_DRAFT, 'nope')).toBeNull();
  });

  it('locates an objective by id', () => {
    expect(objectiveSite(STAGE_DRAFT, objectiveAt(1).id)).toEqual(objectiveAt(1));
    expect(objectiveSite(STAGE_DRAFT, 'nope')).toBeNull();
  });

  it('locates a recommendation with its index', () => {
    const recommendation = STAGE_DRAFT.recommendations[0];
    if (!recommendation) throw new Error('no recommendation');
    expect(recommendationSite(STAGE_DRAFT, recommendation.id)).toEqual({ recommendation, index: 0 });
    expect(recommendationSite(STAGE_DRAFT, 'nope')).toBeNull();
  });
});

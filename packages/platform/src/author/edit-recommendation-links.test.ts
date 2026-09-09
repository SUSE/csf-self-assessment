import { describe, expect, it } from 'vitest';
import { WorkbookSchema } from '../schema';
import type { RecommendationLink, Workbook } from '../schema';
import { removeDimension, updateDimension } from './edit-dimensions';
import { removeObjective, removeQuestion, updateObjective, updateQuestion } from './edit-questions';
import { linkableWorkbook, recOf } from './fixtures';

// Three questions across two objectives, and one recommendation holding the given links.
const linkedWb = (links: RecommendationLink[]): Workbook => {
  const base = linkableWorkbook();
  const [alpha] = base.objectives;
  const [computeQ] = alpha.questions;
  if (computeQ.grain !== 'dimension') throw new Error('the fixture question must be a dimension question');
  return {
    ...base,
    objectives: [
      { ...alpha, questions: [computeQ, { ...computeQ, id: 'A.storage', appliesTo: ['storage'] }] },
      { id: 'SOV-B', name: 'Beta', weight: 0, questions: [{ ...computeQ, id: 'B.info' }] },
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'T',
        action: 'a',
        body: [],
        links,
        whenAtOrBelow: 0,
        horizon: 'strategic',
        order: 0,
      },
    ],
  };
};

const ALL: RecommendationLink[] = [
  { kind: 'question', id: 'A.compute' },
  { kind: 'dimension', id: 'compute' },
  { kind: 'objective', id: 'SOV-A' },
];

const linksAfter = (wb: Workbook) => recOf(wb, 'rec-1').links;

describe('recommendation links survive structural edits', () => {
  it('rewrites a dimension link when the dimension is renamed', () => {
    expect(linksAfter(updateDimension(linkedWb(ALL), 'compute', { id: 'cpu' }))).toEqual([
      { kind: 'question', id: 'A.compute' },
      { kind: 'dimension', id: 'cpu' },
      { kind: 'objective', id: 'SOV-A' },
    ]);
  });

  it('rewrites an objective link when the objective is renamed', () => {
    expect(linksAfter(updateObjective(linkedWb(ALL), 'SOV-A', { id: 'SOV-Z' }))).toEqual([
      { kind: 'question', id: 'A.compute' },
      { kind: 'dimension', id: 'compute' },
      { kind: 'objective', id: 'SOV-Z' },
    ]);
  });

  it('rewrites a question link when the question is renamed', () => {
    expect(linksAfter(updateQuestion(linkedWb(ALL), 'A.compute', { id: 'A.cpu' }))).toEqual([
      { kind: 'question', id: 'A.cpu' },
      { kind: 'dimension', id: 'compute' },
      { kind: 'objective', id: 'SOV-A' },
    ]);
  });

  it('strips a dimension link when the dimension is removed', () => {
    expect(linksAfter(removeDimension(linkedWb(ALL), 'compute'))).toEqual([
      { kind: 'question', id: 'A.compute' },
      { kind: 'objective', id: 'SOV-A' },
    ]);
  });

  it('strips a question link when the question is removed', () => {
    expect(linksAfter(removeQuestion(linkedWb(ALL), 'A.compute'))).toEqual([
      { kind: 'dimension', id: 'compute' },
      { kind: 'objective', id: 'SOV-A' },
    ]);
  });

  it('takes an objective’s questions’ links with the objective', () => {
    expect(linksAfter(removeObjective(linkedWb(ALL), 'SOV-A'))).toEqual([{ kind: 'dimension', id: 'compute' }]);
  });

  it('may leave a recommendation with no link at all, and says so', () => {
    const wb = removeDimension(linkedWb([{ kind: 'dimension', id: 'compute' }]), 'compute');
    expect(linksAfter(wb)).toEqual([]);
    const parsed = WorkbookSchema.safeParse(wb);
    expect(parsed.success).toBe(false);
    const messages = parsed.success ? [] : parsed.error.issues.map((i) => i.message);
    expect(messages).toContain('Link this recommendation to at least one question, dimension or objective.');
  });
});

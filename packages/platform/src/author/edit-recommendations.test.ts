import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import {
  LINK_KIND_LABELS,
  LINK_KINDS,
  addRecommendation,
  linkRecommendation,
  linkStanding,
  linkTargets,
  removeRecommendation,
  setRecommendationBody,
  unlinkRecommendation,
  updateRecommendation,
} from './edit-recommendations';
import { setRecommender } from './edit-meta';
import { linkableWorkbook, recOf } from './fixtures';

// One recommendation, linked to compute, with a body.
const authored = (): Workbook => {
  const linked = linkRecommendation(addRecommendation(linkableWorkbook()), 'rec-1', {
    kind: 'dimension',
    id: 'compute',
  });
  return setRecommendationBody(linked, 'rec-1', ['first', '- second']);
};

describe('the recommender block', () => {
  it('is created on the first keystroke', () => {
    const result = setRecommender(linkableWorkbook(), { name: 'SUSE' });
    expect(result.recommender).toEqual({ name: 'SUSE', disclosure: '' });
    expect(result.recommender !== undefined && 'contact' in result.recommender).toBe(false);
  });

  it('keeps a half-written contact rather than losing the half you typed', () => {
    const half = setRecommender(linkableWorkbook(), { contactLabel: 'Talk to an Expert' });
    expect(half.recommender?.contact).toEqual({ label: 'Talk to an Expert', url: '' });
    const whole = setRecommender(half, { contactUrl: 'https://suse.com' });
    expect(whole.recommender?.contact).toEqual({ label: 'Talk to an Expert', url: 'https://suse.com' });
  });

  it('is dropped once every field is empty', () => {
    const populated = setRecommender(linkableWorkbook(), {
      name: 'SUSE',
      disclosure: 'They sell things.',
      contactLabel: 'Talk to an Expert',
      contactUrl: 'https://suse.com',
    });
    const emptied = setRecommender(populated, { name: '', disclosure: '', contactLabel: '', contactUrl: '' });
    expect('recommender' in emptied).toBe(false);
  });
});

describe('authoring a recommendation', () => {
  it('adds a blank recommendation that glows until it is authored', () => {
    const once = addRecommendation(linkableWorkbook());
    expect(once.recommendations).toEqual([
      {
        id: 'rec-1',
        title: 'New recommendation',
        action: '',
        body: [],
        links: [],
        whenAtOrBelow: 0,
        horizon: 'strategic',
        order: 0,
      },
    ]);
    const twice = addRecommendation(once);
    expect(twice.recommendations.map((r) => r.id)).toEqual(['rec-1', 'rec-2']);
    expect(twice.recommendations.map((r) => r.order)).toEqual([0, 1]);
  });

  it('patches the scalars and leaves links and body alone', () => {
    const wb = authored();
    const before = recOf(wb, 'rec-1');
    const after = recOf(
      updateRecommendation(wb, 'rec-1', { title: 'T', whenAtOrBelow: 2, horizon: 'renewal', order: 3 }),
      'rec-1',
    );
    expect(after.title).toBe('T');
    expect(after.whenAtOrBelow).toBe(2);
    expect(after.horizon).toBe('renewal');
    expect(after.order).toBe(3);
    expect(after.links).toBe(before.links);
    expect(after.body).toBe(before.body);
  });

  it('replaces the body whole', () => {
    expect(recOf(setRecommendationBody(authored(), 'rec-1', ['a', '- b']), 'rec-1').body).toEqual(['a', '- b']);
  });

  it('removes one recommendation and nothing else', () => {
    const wb = addRecommendation(addRecommendation(linkableWorkbook()));
    const result = removeRecommendation(wb, 'rec-1');
    expect(result.recommendations.map((r) => r.id)).toEqual(['rec-2']);
    expect(result.objectives).toEqual(wb.objectives);
    expect(result.dimensions).toEqual(wb.dimensions);
  });

  it('is a no-op for an unknown recommendation id', () => {
    const wb = authored();
    const before = wb.recommendations;
    expect(updateRecommendation(wb, 'gone', { title: 'x' }).recommendations).toEqual(before);
    expect(removeRecommendation(wb, 'gone').recommendations).toEqual(before);
    expect(setRecommendationBody(wb, 'gone', ['x']).recommendations).toEqual(before);
    expect(linkRecommendation(wb, 'gone', { kind: 'dimension', id: 'storage' }).recommendations).toEqual(before);
    expect(unlinkRecommendation(wb, 'gone', { kind: 'dimension', id: 'compute' }).recommendations).toEqual(before);
  });
});

describe('linking a recommendation to the workbook', () => {
  it('links idempotently and unlinks by (kind, id)', () => {
    let wb = addRecommendation(linkableWorkbook());
    wb = linkRecommendation(wb, 'rec-1', { kind: 'dimension', id: 'compute' });
    wb = linkRecommendation(wb, 'rec-1', { kind: 'dimension', id: 'compute' });
    expect(recOf(wb, 'rec-1').links).toEqual([{ kind: 'dimension', id: 'compute' }]);
    wb = linkRecommendation(wb, 'rec-1', { kind: 'question', id: 'A.compute' });
    expect(recOf(wb, 'rec-1').links).toEqual([
      { kind: 'dimension', id: 'compute' },
      { kind: 'question', id: 'A.compute' },
    ]);
    const wrongKind = unlinkRecommendation(wb, 'rec-1', { kind: 'objective', id: 'compute' });
    expect(recOf(wrongKind, 'rec-1').links).toEqual(recOf(wb, 'rec-1').links);
    const unlinked = unlinkRecommendation(wb, 'rec-1', { kind: 'dimension', id: 'compute' });
    expect(recOf(unlinked, 'rec-1').links).toEqual([{ kind: 'question', id: 'A.compute' }]);
  });

  it('offers every kind exactly once', () => {
    expect(LINK_KINDS).toEqual(['question', 'dimension', 'objective']);
    expect([...LINK_KINDS].sort()).toEqual(Object.keys(LINK_KIND_LABELS).sort());
  });

  it('labels every target as “id — name”', () => {
    const wb = linkableWorkbook();
    expect(linkTargets(wb, 'dimension')).toEqual([
      { id: 'compute', label: 'compute — Compute' },
      { id: 'storage', label: 'storage — Storage' },
    ]);
    expect(linkTargets(wb, 'objective')).toEqual([{ id: 'SOV-A', label: 'SOV-A — Alpha' }]);
    expect(linkTargets(wb, 'question')).toEqual([{ id: 'A.compute', label: 'A.compute — How is compute governed?' }]);
  });

  it('names the blank ones rather than showing a bare dash', () => {
    const base = linkableWorkbook();
    const wb: Workbook = {
      ...base,
      dimensions: base.dimensions.map((d) => ({ ...d, name: '' })),
      objectives: base.objectives.map((o) => ({
        ...o,
        name: '',
        questions: o.questions.map((q) => ({ ...q, text: '' })),
      })),
    };
    expect(linkTargets(wb, 'question')[0]?.label).toBe('A.compute — (untitled question)');
    expect(linkTargets(wb, 'dimension')[0]?.label).toBe('compute — (unnamed dimension)');
    expect(linkTargets(wb, 'objective')[0]?.label).toBe('SOV-A — (unnamed objective)');
  });

  it('splits the catalogue against one destination', () => {
    let wb = addRecommendation(addRecommendation(linkableWorkbook()));
    wb = linkRecommendation(wb, 'rec-1', { kind: 'dimension', id: 'compute' });
    const onCompute = linkStanding(wb, { kind: 'dimension', id: 'compute' });
    expect(onCompute.linked.map((r) => r.id)).toEqual(['rec-1']);
    expect(onCompute.unlinked.map((r) => r.id)).toEqual(['rec-2']);
    const asQuestion = linkStanding(wb, { kind: 'question', id: 'compute' });
    expect(asQuestion.linked).toEqual([]);
    expect(asQuestion.unlinked.map((r) => r.id)).toEqual(['rec-1', 'rec-2']);
  });
});

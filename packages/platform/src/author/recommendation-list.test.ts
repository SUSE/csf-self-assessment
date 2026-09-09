import { describe, expect, it } from 'vitest';
import type { Recommendation, Workbook } from '../schema';
import {
  NO_RECOMMENDATION_FILTER,
  filterRecommendationRows,
  isRecommendationFilterNarrowed,
  recommendationFacets,
  recommendationFilterSummary,
  recommendationOptionName,
  recommendationRows,
} from './recommendation-list';

// The list model reads objectives/dimensions only to resolve link labels, so
// the fixtures build just that shape rather than a full strict workbook.
function rec(patch: Partial<Recommendation> & { id: string }): Recommendation {
  return {
    title: '',
    action: '',
    body: [],
    links: [],
    whenAtOrBelow: 0,
    horizon: 'strategic',
    order: 0,
    ...patch,
  } as Recommendation;
}

const WB = {
  objectives: [
    {
      id: 'SOV-1',
      name: 'Operational autonomy',
      questions: [
        { id: 'q-keys', text: 'Who holds the encryption keys?' },
        { id: 'q-exit', text: 'Can the workload be moved out?' },
      ],
    },
  ],
  dimensions: [{ id: 'dim-data', name: 'Data' }],
  recommendations: [
    rec({
      id: 'rec-keys',
      title: 'Bring keys in house',
      action: 'Hold your own keys',
      body: ['Custody is the whole point.'],
      horizon: 'renewal',
      links: [{ kind: 'question', id: 'q-keys' }],
    }),
    rec({
      id: 'rec-exit',
      title: 'Plan the exit',
      action: 'Write an exit runbook',
      horizon: 'strategic',
      links: [
        { kind: 'question', id: 'q-exit' },
        { kind: 'dimension', id: 'dim-gone' },
      ],
    }),
    rec({ id: 'rec-idle', title: 'Unattached pitch', horizon: 'strategic', links: [] }),
  ],
} as unknown as Workbook;

const ROWS = recommendationRows(WB);

describe('recommendationRows', () => {
  it('keeps workbook order and carries each row’s index', () => {
    expect(ROWS.map((r) => [r.recommendation.id, r.index])).toEqual([
      ['rec-keys', 0],
      ['rec-exit', 1],
      ['rec-idle', 2],
    ]);
  });

  it('resolves each link to the label the picker shows', () => {
    expect(ROWS[0].links).toEqual([
      {
        link: { kind: 'question', id: 'q-keys' },
        kindLabel: 'Question',
        label: 'q-keys — Who holds the encryption keys?',
      },
    ]);
  });

  it('renders a dangling link as its raw id, never blank', () => {
    expect(ROWS[1].links[1].label).toBe('dim-gone');
  });
});

describe('filterRecommendationRows', () => {
  const withQuery = (query: string) =>
    filterRecommendationRows(ROWS, { ...NO_RECOMMENDATION_FILTER, query }).map(
      (r) => r.recommendation.id,
    );

  it('matches the recommendation’s own prose', () => {
    expect(withQuery('runbook')).toEqual(['rec-exit']);
    expect(withQuery('custody')).toEqual(['rec-keys']);
  });

  it('matches the questions attached to it', () => {
    expect(withQuery('encryption')).toEqual(['rec-keys']);
    expect(withQuery('q-exit')).toEqual(['rec-exit']);
  });

  it('requires every term, and ignores case and padding', () => {
    expect(withQuery('  PLAN   exit ')).toEqual(['rec-exit']);
    expect(withQuery('plan keys')).toEqual([]);
  });

  it('narrows by horizon', () => {
    expect(
      filterRecommendationRows(ROWS, { ...NO_RECOMMENDATION_FILTER, horizon: 'renewal' }).map(
        (r) => r.recommendation.id,
      ),
    ).toEqual(['rec-keys']);
  });

  it('narrows by linkage', () => {
    expect(
      filterRecommendationRows(ROWS, { ...NO_RECOMMENDATION_FILTER, linkage: 'unlinked' }).map(
        (r) => r.recommendation.id,
      ),
    ).toEqual(['rec-idle']);
    expect(
      filterRecommendationRows(ROWS, { ...NO_RECOMMENDATION_FILTER, linkage: 'linked' }).map(
        (r) => r.recommendation.id,
      ),
    ).toEqual(['rec-keys', 'rec-exit']);
  });

  it('an empty filter shows everything', () => {
    expect(filterRecommendationRows(ROWS, NO_RECOMMENDATION_FILTER)).toHaveLength(3);
    expect(isRecommendationFilterNarrowed(NO_RECOMMENDATION_FILTER)).toBe(false);
    expect(isRecommendationFilterNarrowed({ ...NO_RECOMMENDATION_FILTER, query: ' ' })).toBe(false);
  });
});

describe('recommendationFacets', () => {
  it('counts each option with THAT option applied and the rest of the filter held', () => {
    const facets = recommendationFacets(ROWS, { ...NO_RECOMMENDATION_FILTER, linkage: 'linked' });
    // Two rows are linked; only one of those is renewal.
    expect(facets.horizons).toEqual([
      { value: 'all', label: 'All', count: 2 },
      { value: 'renewal', label: 'Renewal', count: 1 },
      { value: 'strategic', label: 'Strategic', count: 1 },
    ]);
    expect(facets.linkage.map((o) => [o.value, o.count])).toEqual([
      ['all', 3],
      ['linked', 2],
      ['unlinked', 1],
    ]);
    expect([facets.shown, facets.total]).toEqual([2, 3]);
  });

  it('counts under an active query too', () => {
    const facets = recommendationFacets(ROWS, { ...NO_RECOMMENDATION_FILTER, query: 'exit' });
    expect(facets.horizons.find((o) => o.value === 'renewal')?.count).toBe(0);
    expect(facets.shown).toBe(1);
  });
});

describe('recommendationFilterSummary', () => {
  it('says so plainly when nothing is narrowed', () => {
    expect(recommendationFilterSummary(NO_RECOMMENDATION_FILTER, 3, 3)).toBe(
      'Showing all 3 recommendations.',
    );
  });

  it('names every narrowing in force', () => {
    expect(
      recommendationFilterSummary(
        { query: ' keys ', horizon: 'renewal', linkage: 'linked' },
        1,
        3,
      ),
    ).toBe('Showing 1 of 3 — recommendations renewal horizon, linked to something, matching “keys”.');
  });

  it('words the unlinked narrowing as the reason it matters', () => {
    expect(recommendationFilterSummary({ ...NO_RECOMMENDATION_FILTER, linkage: 'unlinked' }, 1, 3)).toBe(
      'Showing 1 of 3 — recommendations not linked to anything yet.',
    );
  });
});

describe('recommendationOptionName', () => {
  it('spells the count out, singular and plural', () => {
    expect(recommendationOptionName('Renewal', 1)).toBe('Renewal — 1 recommendation');
    expect(recommendationOptionName('Renewal', 0)).toBe('Renewal — 0 recommendations');
  });
});

import { describe, expect, it } from 'vitest';
import type { ClashResolution } from '../schema';
import { targetKey } from '../assessment';
import { isClash } from './clash-types';
import type { LandingClash } from './clash-types';
import { reviewLanding, reviewSummary } from './review';
import { upsertResolution } from './choices';
import { suggest } from './suggest';
import { NO_FILTER, filterClashes, filterSummary, participantsOf, queueFacets, queueGroups } from './queue';
import { JANE, WA, janeClashes, landAlex } from './estate-fixture';

const keysIn = (clashes: LandingClash[]): string[] =>
  clashes.map((clash) => `${clash.questionId} ${targetKey(clash.target)}`);

const missingFrom = (clashes: LandingClash[]): string[] => {
  const shown = new Set(keysIn(clashes));
  return keysIn(janeClashes()).filter((key) => !shown.has(key));
};

describe('the clash queue over the Alex/Jane pair', () => {
  it('the queue names both participants', () => {
    expect(participantsOf(janeClashes())).toEqual(['Alex', 'Jane']);
  });

  it('the queue groups the 30 clashes into the 8 objectives that carry one', () => {
    const groups = queueGroups(janeClashes(), WA.workbook, []);
    expect(groups).toHaveLength(8);
    expect(groups.map((g) => g.objectiveId)).toEqual([
      'SOV-1',
      'SOV-2',
      'SOV-3',
      'SOV-4',
      'SOV-5',
      'SOV-6',
      'SOV-7',
      'SOV-8',
    ]);
    expect(groups.map((g) => g.clashes.length)).toEqual([3, 1, 6, 8, 5, 2, 3, 2]);
    expect(groups.reduce((n, g) => n + g.clashes.length, 0)).toBe(30);
    expect(groups[0].name).toBe('Strategic Sovereignty');
    expect(groups[7].name).toBe('Environmental Sustainability');
  });

  it('floor movers hide the four clashes that cannot gate the floor', () => {
    const shown = filterClashes(janeClashes(), WA.workbook, { ...NO_FILTER, floorMoversOnly: true }, []);
    expect(shown).toHaveLength(26);
    expect(missingFrom(shown)).toEqual([
      'SOV-3.data-residency dimension:edge',
      'SOV-4.facilities-control dimension:facilities',
      'SOV-8.energy-origin dimension:facilities',
      'SOV-8.hardware-circularity assessment',
    ]);
  });

  it('hiding non-scoring hides exactly the two SOV-8 clashes', () => {
    const shown = filterClashes(janeClashes(), WA.workbook, { ...NO_FILTER, hideNonScoring: true }, []);
    expect(shown).toHaveLength(28);
    expect(missingFrom(shown)).toEqual([
      'SOV-8.energy-origin dimension:facilities',
      'SOV-8.hardware-circularity assessment',
    ]);
  });

  it('22 of the 23 divergences are one rung apart', () => {
    const clashes = janeClashes();
    expect(
      filterClashes(clashes, WA.workbook, { ...NO_FILTER, clashClass: 'divergence', oneRungOnly: true }, []),
    ).toHaveLength(22);
    expect(filterClashes(clashes, WA.workbook, { ...NO_FILTER, oneRungOnly: true }, [])).toHaveLength(22);
  });

  it('every filter option carries the count it would leave', () => {
    const facets = queueFacets(janeClashes(), WA.workbook, NO_FILTER, []);
    expect(facets).toMatchObject({ shown: 30, total: 30 });
    expect(facets.classes).toEqual([
      { value: 'all', label: 'All', count: 30 },
      { value: 'divergence', label: 'Divergence', count: 23 },
      { value: 'gap', label: 'Gap', count: 4 },
      { value: 'scope', label: 'Scope', count: 2 },
      { value: 'grain', label: 'Grain', count: 1 },
    ]);
    expect(facets.switches).toEqual([
      { value: 'floorMoversOnly', label: 'Can move the floor', count: 26, on: false },
      { value: 'hideNonScoring', label: 'Hide non-scoring', count: 28, on: false },
      { value: 'oneRungOnly', label: 'One rung apart', count: 22, on: false },
    ]);
    expect(filterSummary(NO_FILTER, facets.shown, facets.total)).toBe('Showing all 30 clashes.');
  });

  it('the open/decided readout follows the decisions the header counts', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    const clashes = review.units.filter(isClash);

    // No bulk control exists: these are 22 individual decisions,
    // one per one-rung divergence, exactly as a facilitator clicks them.
    const oneRung = filterClashes(
      clashes,
      WA.workbook,
      { ...NO_FILTER, clashClass: 'divergence', oneRungOnly: true },
      [],
    );
    expect(oneRung).toHaveLength(22);
    // `oneRungOnly` reads the SEAL ladder, not the authority ladder, so some of
    // these are authority ties with no suggestion — picking a side is still what
    // a click does. Under test is the readout, not `suggest`.
    const resolutions = oneRung.reduce((acc: ClashResolution[], clash) => {
      const choice = suggest(clash)?.choice ?? { kind: 'take' as const, from: 'Alex' };
      return upsertResolution(acc, { questionId: clash.questionId, target: clash.target, choice, note: '' });
    }, []);

    expect(reviewSummary(review, resolutions)).toEqual({
      answers: 61,
      newUnits: 9,
      clashes: 30,
      decided: 22,
      collisions: 1,
    });
    expect(queueFacets(clashes, WA.workbook, NO_FILTER, resolutions).statuses).toEqual([
      { value: 'all', label: 'All', count: 30 },
      { value: 'open', label: 'Open', count: 8 },
      { value: 'decided', label: 'Decided', count: 22 },
    ]);
    expect(
      filterSummary(
        { ...NO_FILTER, status: 'open' },
        filterClashes(clashes, WA.workbook, { ...NO_FILTER, status: 'open' }, resolutions).length,
        clashes.length,
      ),
    ).toBe('Showing 8 of 30 — open clashes.');
  });
});

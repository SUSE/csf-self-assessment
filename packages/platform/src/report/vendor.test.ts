import { describe, expect, it } from 'vitest';
import { recommendationsPage } from '../analytics';
import { SUBJECT_C, SUBJECT_EMPTY } from '../analytics/subjects-fixture';
import { reportVendor } from './vendor';

describe('the Report vendor section', () => {
  it('the section is the recommendations page, attributed', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const vendor = reportVendor(result, workbook, parties);
    const page = recommendationsPage(result, workbook, parties);

    expect(vendor).not.toBeNull();
    if (vendor === null) throw new Error('expected a vendor section');
    expect(vendor.recommender).toEqual(page.recommender);
    expect(vendor.recommender).toEqual({
      kind: 'recommender',
      name: 'SUSE',
      headline: 'Recommendations from SUSE',
      disclosure:
        'SUSE authored this instrument and sells the offers below. A recommendation moves no number in this assessment.',
      contact: { label: 'Talk to an Expert', url: 'https://www.suse.com/contact/' },
      live: 11,
      catalogue: 11,
      reading: '11 of 11 live on this estate',
    });
  });

  it('both horizon chapters print, in reading order', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const vendor = reportVendor(result, workbook, parties);
    const page = recommendationsPage(result, workbook, parties);

    if (vendor === null) throw new Error('expected a vendor section');
    expect(vendor.chapters.map((entry) => entry.chapter.horizon)).toEqual([
      'renewal',
      'strategic',
    ]);
    expect(vendor.chapters.map((entry) => entry.chapter.title)).toEqual([
      'Quick wins',
      'Strategic moves',
    ]);
    for (const entry of vendor.chapters) {
      expect(entry.chapter).toEqual(
        page.chapters.find((chapter) => chapter.horizon === entry.chapter.horizon),
      );
    }
  });

  it('offers are numbered once across the whole section', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const vendor = reportVendor(result, workbook, parties);

    if (vendor === null) throw new Error('expected a vendor section');
    expect(vendor.chapters.map((entry) => entry.ordinalFrom)).toEqual([0, 3]);

    const renewal = vendor.chapters[0]?.chapter.band;
    if (renewal?.kind !== 'cards') throw new Error('expected renewal cards');
    expect(renewal.cards.map((card) => card.id)).toEqual([
      'suse-multi-linux-support',
      'suse-application-collection',
      'suse-sovereign-premium-support',
    ]);

    const strategic = vendor.chapters[1]?.chapter.band;
    if (strategic?.kind !== 'cards') throw new Error('expected strategic cards');
    expect(strategic.cards).toHaveLength(8);
    expect(strategic.cards[0]?.id).toBe('suse-strategic-digital-sovereignty');
  });

  it('every card closes on its trigger', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const vendor = reportVendor(result, workbook, parties);

    if (vendor === null) throw new Error('expected a vendor section');
    const renewal = vendor.chapters[0]?.chapter.band;
    if (renewal?.kind !== 'cards') throw new Error('expected renewal cards');
    expect(renewal.cards[0]?.trigger).toMatchObject({
      label: 'SOV-4.licence-tether',
      seal: 2,
    });
    expect(renewal.cards[0]?.trigger.link.kind).toBe('question');

    const strategic = vendor.chapters[1]?.chapter.band;
    if (strategic?.kind !== 'cards') throw new Error('expected strategic cards');
    expect(strategic.cards[0]?.trigger).toMatchObject({
      label: 'Strategic Sovereignty',
      seal: 0,
    });
    expect(strategic.cards[0]?.trigger.link.kind).toBe('objective');
  });

  it('authored but silent still prints, attributed', () => {
    const { result, workbook, parties } = SUBJECT_EMPTY;
    const vendor = reportVendor(result, workbook, parties);

    expect(vendor).not.toBeNull();
    if (vendor === null) throw new Error('expected a vendor section');
    expect(vendor.recommender.reading).toBe('0 of 11 live on this estate');
    expect(vendor.recommender.live).toBe(0);
    expect(vendor.chapters.map((entry) => entry.ordinalFrom)).toEqual([0, 0]);
    expect(vendor.chapters.map((entry) => entry.chapter.band)).toEqual([
      {
        kind: 'none-fired',
        authored: 3,
        reason:
          '3 renewal recommendations are authored; none matches this estate’s answers yet.',
      },
      {
        kind: 'none-fired',
        authored: 8,
        reason:
          '8 strategic recommendations are authored; none matches this estate’s answers yet.',
      },
    ]);
  });

  it('no recommender, no section', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const { recommender: _recommender, ...workbookWithoutRecommender } = workbook;

    expect(reportVendor(result, workbookWithoutRecommender, parties)).toBeNull();
  });

  it('no recommendations, no section', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const workbookWithoutRecommendations = { ...workbook, recommendations: [] };

    expect(reportVendor(result, workbookWithoutRecommendations, parties)).toBeNull();
  });

  it('the section adds nothing but its own numbering', () => {
    const { result, workbook, parties } = SUBJECT_C;
    const vendor = reportVendor(result, workbook, parties);

    if (vendor === null) throw new Error('expected a vendor section');
    expect(Object.keys(vendor).sort()).toEqual(['chapters', 'recommender']);
    expect(Object.keys(vendor.recommender).sort()).toEqual([
      'catalogue',
      'contact',
      'disclosure',
      'headline',
      'kind',
      'live',
      'name',
      'reading',
    ]);
    for (const entry of vendor.chapters) {
      expect(Object.keys(entry).sort()).toEqual(['chapter', 'ordinalFrom']);
    }
  });
});

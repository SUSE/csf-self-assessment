import { describe, expect, it } from 'vitest';
import { SUBJECT_A } from '../analytics/subjects-fixture';
import type { ReportStamp } from './document';
import { reportDocument } from './document';
import { offerPointers } from './pointers';

const BERLIN: ReportStamp = {
  generatedAt: '2026-08-14T09:30:00.000Z',
  viewer: { locale: 'en-GB', zone: 'Europe/Berlin' },
};

const doc = () => reportDocument(SUBJECT_A.assessment, SUBJECT_A.result, BERLIN);

describe('the offers a reading points at', () => {
  it('names the ordinals the vendor chapter prints for it', () => {
    const { vendor, offers } = doc();
    const printed = (vendor?.chapters ?? []).flatMap(({ chapter, ordinalFrom }) =>
      chapter.band.kind === 'cards'
        ? chapter.band.cards.map((_, i) => ordinalFrom + i + 1)
        : [],
    );

    expect(Object.keys(offers).length).toBeGreaterThan(0);
    for (const readingId of Object.keys(offers)) {
      const ordinals: number[] = offers[readingId] ?? [];
      expect(ordinals.length).toBeGreaterThan(0);
      expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
      expect(new Set(ordinals).size).toBe(ordinals.length);
      for (const ordinal of ordinals) expect(printed).toContain(ordinal);
    }
  });

  it('points only from readings that name questions — never from a figure', () => {
    const pointing = new Set(Object.keys(doc().offers));
    const naming = new Set(['staircase', 'evidence', 'dont-know', 'worth-a-second-look']);

    for (const id of pointing) expect(naming).toContain(id);
  });

  it('an offer points at the Staircase only where they share a question', () => {
    const { vendor, offers, sections } = doc();
    const covered = new Map<number, Set<string>>();
    for (const { chapter, ordinalFrom } of vendor?.chapters ?? []) {
      if (chapter.band.kind !== 'cards') continue;
      chapter.band.cards.forEach((card, i) =>
        covered.set(ordinalFrom + i + 1, new Set(card.questions.map((q) => q.questionId))),
      );
    }

    const asked = new Set<string>();
    for (const section of sections) {
      for (const reading of section.readings) {
        if (reading.id !== 'staircase' || reading.model.kind !== 'climb') continue;
        for (const step of reading.model.steps) {
          for (const row of step.rows) asked.add(row.questionId);
        }
      }
    }

    const pointed: number[] = offers.staircase ?? [];
    expect(pointed.length).toBeGreaterThan(0);
    for (const ordinal of pointed) {
      const shared = [...(covered.get(ordinal) ?? [])].filter((id) => asked.has(id));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it('no vendor section means no pointers at all', () => {
    expect(offerPointers(null, { staircase: ['SOV-1-Q1'] })).toEqual({});
  });

  it('a reading whose questions no offer covers is absent, not empty', () => {
    expect(offerPointers(null, { staircase: [] })).toEqual({});
  });
});

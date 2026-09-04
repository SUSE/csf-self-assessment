import { describe, expect, it } from 'vitest';
import { AssessmentSchema } from '../schema';
import type { Assessment, ClashResolution, EstateBase, Landing } from '../schema';
import { evaluate } from '../score-engine';
import { workbookAssessmentOf } from '../setup';
import { checkPartial, finalizeLanded, isClash, land, reviewLanding, reviewSummary } from './index';
import type { LandingClash } from './clash-types';
import { euCsfCalculatorDeepFillAlexRaw, euCsfCalculatorDeepFillJaneRaw } from '../test-fixtures';

// The two fills over the DEEP calculator. The flat pair next door differs in
// four answers on a grain-free instrument; this pair exists because the deep
// workbook has dimensions, strata and a chain of parties, so it can put all
// four clash classes, sole-source units and a party collision in one merge.

const alex = AssessmentSchema.parse(euCsfCalculatorDeepFillAlexRaw);
const jane = AssessmentSchema.parse(euCsfCalculatorDeepFillJaneRaw);

// A participant scores over `parties ∪ partiesAdded` (ADR-0012): the chain they
// added is theirs until the facilitator lands it.
const onOwnRoster = (a: Assessment): Assessment => ({
  ...a,
  parties: [...a.parties, ...(a.partiesAdded ?? [])],
});

const anchor = workbookAssessmentOf({
  workbook: alex.workbook,
  estate: alex.meta.estate,
  parties: alex.parties,
  id: alex.meta.workbookAssessment,
  createdAt: '2026-08-16T00:00:00.000Z',
});

const emptyBase = (): EstateBase => ({ parties: anchor.parties, answers: [] });

function landAlex(): { base: EstateBase; ledger: Landing[] } {
  const outcome = land(
    emptyBase(),
    [],
    alex,
    { resolutions: [], partyDecisions: [] },
    { id: 'L1', at: '2026-08-16T10:00:00.000Z', note: '' },
  );
  if (!outcome.ok) throw new Error('Alex should land with nothing to decide');
  return outcome;
}

const janeReview = () => {
  const landed = landAlex();
  return { landed, review: reviewLanding(landed.base, landed.ledger, jane, []) };
};

function resolveAll(
  clashes: LandingClash[],
  from: string,
  keep: 'strata' | 'roll-up',
): ClashResolution[] {
  return clashes.map((clash) => ({
    questionId: clash.questionId,
    target: clash.target,
    choice: clash.kind === 'grain-clash' ? { kind: 'grain', keep } : { kind: 'take', from },
    note: '',
  }));
}

describe('the deep calculator fills', () => {
  it('are partials against the same workbook-assessment', () => {
    expect(alex.meta.workbookAssessment).toBe(jane.meta.workbookAssessment);
    expect(checkPartial(anchor, alex)).toEqual({ ok: true });
    expect(checkPartial(anchor, jane)).toEqual({ ok: true });
  });

  it('Alex sweeps the whole 194-unit base but the one the source leaves blank', () => {
    const reading = evaluate(alex.workbook, onOwnRoster(alex));
    expect(reading.overall.floor).toBe(2);
    expect(reading.units).toEqual({
      total: 194,
      answered: 184,
      dontKnow: 0,
      na: 9,
      unanswered: 1,
    });
  });

  it('Jane is a scoped second pass, and her compute split adds three units', () => {
    const reading = evaluate(jane.workbook, onOwnRoster(jane));
    expect(reading.overall.floor).toBe(1);
    expect(reading.units).toEqual({
      total: 197,
      answered: 130,
      dontKnow: 4,
      na: 11,
      unanswered: 52,
    });
  });

  it('Alex lands 193 units against an empty estate, with nothing to decide', () => {
    expect(reviewSummary(reviewLanding(emptyBase(), [], alex, []), [])).toEqual({
      answers: 193,
      newUnits: 193,
      clashes: 0,
      decided: 0,
      collisions: 0,
    });
  });

  it('Jane agrees 111 times, reaches 18 units Alex never did, and clashes 13', () => {
    const { review } = janeReview();
    const kinds = review.units.reduce<Record<string, number>>((counts, unit) => {
      counts[unit.kind] = (counts[unit.kind] ?? 0) + 1;
      return counts;
    }, {});
    expect(kinds).toEqual({ agreed: 111, 'sole-source': 18, 'unit-clash': 12, 'grain-clash': 1 });
  });

  it('the 13 clashes cover all four classes', () => {
    const { review } = janeReview();
    const classes = review.units.filter(isClash).reduce<Record<string, number>>((counts, clash) => {
      counts[clash.clash] = (counts[clash.clash] ?? 0) + 1;
      return counts;
    }, {});
    expect(classes).toEqual({ divergence: 6, gap: 4, scope: 2, grain: 1 });
  });

  it('the grain clash is compute: Alex answered the block, Jane the four layers', () => {
    const { review } = janeReview();
    const grain = review.units.find((unit) => unit.kind === 'grain-clash');
    if (grain?.kind !== 'grain-clash') throw new Error('no grain clash');
    expect(grain.questionId).toBe('SOV-4.2');
    expect(grain.dimension).toBe('compute');
    expect(grain.rollUpSide).toBe('base');
    expect(grain.strata.map((s) => s.stratum)).toEqual([
      'service',
      'software',
      'hardware',
      'chips',
    ]);
  });

  it('the two names for one provider are offered as a party collision', () => {
    const { review } = janeReview();
    // "Helios Cloud EU" against "Helios Cloud Europe SAS" — two names, one
    // provider. It leads the suggestions; the weaker one behind it shares only
    // the word "Europe" and is exactly what a facilitator is there to reject.
    const best = review.pairs[0];
    if (best.kind !== 'alias') throw new Error('the leading suggestion is not an alias');
    expect([best.base.id, best.incoming.id]).toEqual(['helios-cloud', 'helios-europe']);
    expect(best.sharedTokens).toEqual(['helios', 'cloud']);
    expect(
      review.pairs.every((pair) => pair.kind !== 'alias' || pair.score <= best.score),
    ).toBe(true);
  });

  it('keeping Jane’s strata drops the floor a whole SEAL level', () => {
    const { landed, review } = janeReview();
    const outcome = land(
      landed.base,
      landed.ledger,
      jane,
      { resolutions: resolveAll(review.units.filter(isClash), 'Jane', 'strata'), partyDecisions: [] },
      { id: 'L2', at: '2026-08-16T11:00:00.000Z', note: '' },
    );
    if (!outcome.ok) throw new Error('Jane failed to land');
    const finalized = finalizeLanded(anchor, outcome.base, outcome.ledger);
    const reading = evaluate(finalized.workbook, { ...finalized, parties: outcome.base.parties });
    // Alex alone read SEAL-2. The chips stratum is the floor the roll-up hid.
    expect(reading.overall.floor).toBe(1);
    expect(reading.units.total).toBe(215);
  });

  it('keeping Alex’s roll-up holds the estate where Alex left it', () => {
    const { landed, review } = janeReview();
    const outcome = land(
      landed.base,
      landed.ledger,
      jane,
      {
        resolutions: resolveAll(review.units.filter(isClash), 'Alex', 'roll-up'),
        partyDecisions: [],
      },
      { id: 'L2', at: '2026-08-16T11:00:00.000Z', note: '' },
    );
    if (!outcome.ok) throw new Error('Jane failed to land');
    const finalized = finalizeLanded(anchor, outcome.base, outcome.ledger);
    const reading = evaluate(finalized.workbook, { ...finalized, parties: outcome.base.parties });
    expect(reading.overall.floor).toBe(2);
  });
});

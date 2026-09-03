import { describe, expect, it } from 'vitest';
import type { ClashResolution } from '../schema';
import { landingChecks } from './checks';
import { isClash } from './clash-types';
import { reviewLanding } from './review';
import { JANE, WA, landAlex, takeJane } from './estate-fixture';

const ACME_FLOOR = { seal: 0, targetKey: 'party:acme-eu' } as const;

describe('the landing checks over the Alex/Jane pair', () => {
  it('the checks read the landing under review', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    expect(landingChecks(WA, alex.base, review, [])).toEqual({
      floor: {
        seal: 0,
        unlocksTo: 1,
        binding: [
          { questionId: 'SOV-1.decisive-authority', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
          { questionId: 'SOV-2.compellability', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
        ],
      },
      coverage: { placed: 90, total: 93 },
      dontKnow: 2,
      outOfClaim: 0,
      undecided: 30,
    });
  });

  it('deciding the grain clash moves the floor’s binding answer', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    const grainResolution = (keep: 'strata' | 'roll-up'): ClashResolution => ({
      questionId: 'SOV-4.withdrawal-survival',
      target: { kind: 'dimension', dimension: 'storage' },
      choice: { kind: 'grain', keep },
      note: '',
    });

    const strata = landingChecks(WA, alex.base, review, [grainResolution('strata')]);
    expect(strata.floor.seal).toBe(0);
    expect(strata.undecided).toBe(29);
    expect(strata.floor.binding).toEqual([
      { questionId: 'SOV-1.decisive-authority', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
      { questionId: 'SOV-2.compellability', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
      {
        questionId: 'SOV-4.withdrawal-survival',
        label: 'Storage · chips',
        seal: 0,
        targetKey: 'dimension-stratum:storage:chips',
      },
    ]);

    const rollUp = landingChecks(WA, alex.base, review, [grainResolution('roll-up')]);
    expect(rollUp.floor.binding).toEqual([
      { questionId: 'SOV-1.decisive-authority', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
      { questionId: 'SOV-2.compellability', label: 'Acme Cloud Europe SAS', ...ACME_FLOOR },
    ]);
  });

  it('all 30 decided', () => {
    const alex = landAlex();
    const review = reviewLanding(alex.base, alex.ledger, JANE, []);
    const checks = landingChecks(WA, alex.base, review, takeJane(review.units.filter(isClash)));
    expect(checks.coverage).toEqual({ placed: 93, total: 96 });
    expect(checks.dontKnow).toBe(4);
    expect(checks.undecided).toBe(0);
    expect(checks.floor.binding).toHaveLength(8);
    expect(checks.floor.binding).toContainEqual({
      questionId: 'SOV-4.withdrawal-survival',
      label: 'Storage · chips',
      seal: 0,
      targetKey: 'dimension-stratum:storage:chips',
    });
  });
});

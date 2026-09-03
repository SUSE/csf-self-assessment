import type { Answer, ClashResolution, Target } from '../schema';
import { targetKey } from '../assessment';
import { clashCandidates } from './clash-types';
import type { LandingClash, ReviewCandidate } from './clash-types';

// What a decided clash writes back onto the estate base (merge.md §2.5).

/** One answer unit a clash's decision writes: what stands there afterwards, or
 *  `null` when the decision emptied it. */
export type ClashUnitOutcome = {
  target: Target;
  candidates: ReviewCandidate[];
  answer: Answer | null;
};

/** What a clash's resolution writes — one entry per unit the clash covers, or
 *  `null` when the clash is still undecided (including a resolution whose
 *  choice does not fit this clash's class). */
export function resolveClash(
  clash: LandingClash,
  resolution: ClashResolution | undefined,
): ClashUnitOutcome[] | null {
  if (resolution === undefined) return null;
  const choice = resolution.choice;
  if (clash.kind === 'grain-clash') {
    if (choice.kind !== 'grain') return null;
    const keepStrata = choice.keep === 'strata';
    return [
      {
        target: clash.target,
        candidates: [clash.rollUp],
        answer: keepStrata ? null : clash.rollUp.answer,
      },
      ...clash.strata.map((s) => ({
        target: s.target,
        candidates: [s.candidate],
        answer: keepStrata ? s.candidate.answer : null,
      })),
    ];
  }
  const candidates = clashCandidates(clash);
  switch (choice.kind) {
    case 'take': {
      const candidate = candidates.find((c) => c.from === choice.from);
      return candidate === undefined ? null : [{ target: clash.target, candidates, answer: candidate.answer }];
    }
    case 'reanswer':
      return [
        {
          target: clash.target,
          candidates,
          answer: {
            questionId: clash.questionId,
            target: clash.target,
            state: 'answered',
            rungId: choice.rungId,
            gesture: {
              groupId: `facilitator:${clash.questionId}:${targetKey(clash.target)}`,
              placement: 'individual',
            },
          },
        },
      ];
    case 'grain':
      return null;
  }
}

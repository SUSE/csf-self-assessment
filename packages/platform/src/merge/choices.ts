import type { ClashChoice, ClashResolution, Question, Seal, Target } from '../schema';
import { targetKey } from '../assessment';
import { answerLabel, rungLabel } from '../utils/answer-label';
import type { LandingClash, ReviewCandidate, UnitClash } from './clash-types';

// The enumerated resolutions a clash offers (merge.md §2.2, invariant #9) and
// the decision list they accumulate into: the set IS the truth, and these labels
// are the ledger's vocabulary. Components render them; nothing invents an option
// in markup.

const unitKey = (questionId: string, target: Target): string => `${questionId} ${targetKey(target)}`;

/** Record a decision: the resolutions with any previous decision on the same
 *  unit replaced, the new one appended last. A changed mind is a replacement
 *  here and an appended RECORD at landing — the ledger is what is append-only
 *  (merge.md §2.4.4), not the undecided draft. */
export function upsertResolution(
  resolutions: ClashResolution[],
  resolution: ClashResolution,
): ClashResolution[] {
  const key = unitKey(resolution.questionId, resolution.target);
  return [...resolutions.filter((r) => unitKey(r.questionId, r.target) !== key), resolution];
}

/** One enumerated resolution a facilitator may pick for a clash (merge.md §2.2).
 *  `key` identifies the option in the radio group AND matches an existing
 *  resolution's choice. */
export type ClashOption = { key: string; label: string; choice: ClashChoice };

export function choiceKey(choice: ClashChoice): string {
  switch (choice.kind) {
    case 'take':
      return `take:${choice.from}`;
    case 'reanswer':
      return `reanswer:${choice.rungId}`;
    case 'grain':
      return `grain:${choice.keep}`;
  }
}

const take = (candidate: ReviewCandidate, label: string): ClashOption => ({
  key: choiceKey({ kind: 'take', from: candidate.from }),
  label,
  choice: { kind: 'take', from: candidate.from },
});

/** The choices this clash offers, in presentation order. A resolution the engine
 *  would override is never among them (invariant #9). */
export function optionsFor(clash: LandingClash, question: Question): ClashOption[] {
  if (clash.kind === 'grain-clash') {
    const count = clash.strata.length;
    const answers = count === 1 ? '1 stratum answer' : `${count} stratum answers`;
    const stands = count === 1 ? 'stands' : 'stand';
    return [
      {
        key: 'grain:strata',
        label: `Keep the strata — ${answers} ${stands}, the roll-up is dropped`,
        choice: { kind: 'grain', keep: 'strata' },
      },
      {
        key: 'grain:roll-up',
        label: `Keep the roll-up — deletes ${answers}`,
        choice: { kind: 'grain', keep: 'roll-up' },
      },
    ];
  }
  switch (clash.clash) {
    case 'gap':
      return gapOptions(clash, question);
    case 'scope':
      return scopeOptions(clash, question);
    case 'divergence':
      return [
        take(clash.base, `Take ${clash.base.from}’s ${answerLabel(question, clash.base.answer)}`),
        take(clash.incoming, `Take ${clash.incoming.from}’s ${answerLabel(question, clash.incoming.answer)}`),
        ...question.ladder.map((rung) => ({
          key: choiceKey({ kind: 'reanswer', rungId: rung.id }),
          label: `Re-answer at ${rungLabel(question, rung.id)}`,
          choice: { kind: 'reanswer' as const, rungId: rung.id },
        })),
      ];
  }
}

function gapOptions(clash: UnitClash, question: Question): ClashOption[] {
  const [knowing, unknowing] =
    clash.base.answer.state === 'dont-know' ? [clash.incoming, clash.base] : [clash.base, clash.incoming];
  return [
    take(knowing, `Take the knowledge — ${knowing.from}’s ${answerLabel(question, knowing.answer)}`),
    take(unknowing, `Keep don’t know — ${unknowing.from} did not know`),
  ];
}

function scopeOptions(clash: UnitClash, question: Question): ClashOption[] {
  const [applying, excluded] =
    clash.base.answer.state === 'na' ? [clash.incoming, clash.base] : [clash.base, clash.incoming];
  return [
    take(applying, `It applies — take ${applying.from}’s ${answerLabel(question, applying.answer)}`),
    take(excluded, `It doesn’t apply — take ${excluded.from}’s ${answerLabel(question, excluded.answer)}`),
  ];
}

/** One re-answer option resolved against the rung it names — one cell of the
 *  queue's re-answer strip. `position` is what the cell PRINTS, because a
 *  repeated SEAL makes the SEAL digit name nothing (instrument.md §4.1–4.2). */
export type ReanswerCell = {
  key: string;
  rungId: string;
  /** 1-based authored position. */
  position: number;
  seal: Seal;
  /** The option's full sentence — the cell's accessible name. */
  label: string;
};

/** `optionsFor`'s re-answer options paired with their rungs, in authored ladder
 *  order. An option naming no rung of this question is dropped, so no cell can
 *  fall back to a SEAL it did not read. */
export function reanswerCells(
  options: ClashOption[],
  question: Pick<Question, 'ladder'>,
): ReanswerCell[] {
  return question.ladder.flatMap((rung, i) => {
    const key = choiceKey({ kind: 'reanswer', rungId: rung.id });
    const option = options.find((o) => o.key === key);
    return option === undefined
      ? []
      : [{ key, rungId: rung.id, position: i + 1, seal: rung.seal, label: option.label }];
  });
}

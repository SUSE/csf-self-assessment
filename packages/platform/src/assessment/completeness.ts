import type { Answer, Assessment, Claim, Party, Question, Target, Workbook } from '../schema';
import { findAnswer } from './answers';
import { questionUnits } from './units';
import { claimCoversUnit } from './walk';

// Every (question, base unit) of the whole workbook, in order. questionUnits fans a
// dimension to its strata once any stratum carries an answer, so scoped views count
// at the grain participants actually asserted.
function baseUnits(workbook: Workbook, parties: Party[], answers: Answer[]): { question: Question; target: Target }[] {
  return workbook.objectives.flatMap((o) =>
    o.questions.flatMap((question) =>
      questionUnits(workbook, parties, answers, question).map((target) => ({ question, target })),
    ),
  );
}

// Was a (question, unit) dealt with? A direct hit, or — for a stratum target — a hit
// on the whole parent dimension (D3). The fallback is inert within one partial
// (dropSuperseded bars coexisting grains); it bridges the cross-partial mixed grain
// estateCoverage sees.
function recordedAt(answers: Answer[], questionId: string, target: Target): boolean {
  if (findAnswer(answers, questionId, target) !== undefined) return true;
  return (
    target.kind === 'dimension-stratum' &&
    findAnswer(answers, questionId, { kind: 'dimension', dimension: target.dimension }) !== undefined
  );
}

// Scoped completeness at unit grain (delivery §2.7.1): over the base units a claim
// covers, how many carry a recorded answer of any state. scopeCompleteness is the
// union across the whole claim log, each unit counted once.
export type ScopeCompleteness = { answered: number; total: number };

export function claimCompleteness(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  claim: Claim,
): ScopeCompleteness {
  const units = baseUnits(workbook, parties, answers).filter(({ question, target }) =>
    claimCoversUnit(claim, question, target),
  );
  const answered = units.filter(({ question, target }) => recordedAt(answers, question.id, target)).length;
  return { answered, total: units.length };
}

export function scopeCompleteness(
  workbook: Workbook,
  parties: Party[],
  answers: Answer[],
  claims: Claim[],
): ScopeCompleteness {
  const units = baseUnits(workbook, parties, answers).filter(({ question, target }) =>
    claims.some((claim) => claimCoversUnit(claim, question, target)),
  );
  const answered = units.filter(({ question, target }) => recordedAt(answers, question.id, target)).length;
  return { answered, total: units.length };
}

// Estate coverage across loaded partials (delivery §2.6/§4.3): each unit is covered
// (some partial recorded it), claimed-incomplete (no answer but some partial claims
// it), or unclaimed. covered wins over claimed-incomplete.
export type EstateCoverage = { covered: number; claimedIncomplete: number; unclaimed: number; total: number };

export function estateCoverage(workbook: Workbook, parties: Party[], partials: Assessment[]): EstateCoverage {
  const units = baseUnits(
    workbook,
    parties,
    partials.flatMap((p) => p.answers),
  );
  let covered = 0;
  let claimedIncomplete = 0;
  let unclaimed = 0;
  for (const { question, target } of units) {
    if (partials.some((p) => recordedAt(p.answers, question.id, target))) {
      covered += 1;
    } else if (partials.some((p) => (p.claims ?? []).some((claim) => claimCoversUnit(claim, question, target)))) {
      claimedIncomplete += 1;
    } else {
      unclaimed += 1;
    }
  }
  return { covered, claimedIncomplete, unclaimed, total: units.length };
}

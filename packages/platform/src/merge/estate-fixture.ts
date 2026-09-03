import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AssessmentSchema, WorkbookAssessmentSchema } from '../schema';
import type { ClashResolution, EstateBase, Landing } from '../schema';
import { classify, isClash } from './clash-types';
import type { LandingClash } from './clash-types';
import { reviewLanding } from './review';
import { land } from './land';

const read = (file: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../assessment/${file}`, import.meta.url)), 'utf8'));

export const WA = WorkbookAssessmentSchema.parse(read('workbook-assessment.json'));
export const ALEX = AssessmentSchema.parse(read('partial-Alex.json'));
export const JANE = AssessmentSchema.parse(read('partial-Jane.json'));

export const NO_DECISIONS = { resolutions: [] as ClashResolution[], partyDecisions: [] };

export const ALEX_STAMP = { id: '11111111-1111-4111-8111-111111111111', at: 'T1', note: '' };
export const JANE_STAMP = {
  id: '22222222-2222-4222-8222-222222222222',
  at: 'T2',
  note: 'after the security discussion',
};

export const emptyBase = (): EstateBase => ({ parties: WA.parties, answers: [] });

/** Every clash decided the way a facilitator can decide it without thinking. */
export const takeJane = (clashes: LandingClash[]): ClashResolution[] =>
  clashes.map((clash) => ({
    questionId: clash.questionId,
    target: clash.target,
    choice: clash.kind === 'grain-clash' ? { kind: 'grain', keep: 'strata' } : { kind: 'take', from: 'Jane' },
    note: '',
  }));

export function landAlex(): { base: EstateBase; ledger: Landing[] } {
  const outcome = land(emptyBase(), [], ALEX, NO_DECISIONS, ALEX_STAMP);
  if (!outcome.ok) throw new Error('Alex should land with nothing to decide');
  return { base: outcome.base, ledger: outcome.ledger };
}

export function landJane(): { base: EstateBase; ledger: Landing[] } {
  const alex = landAlex();
  const resolutions = takeJane(classify(alex.base, alex.ledger, JANE).filter(isClash));
  const outcome = land(alex.base, alex.ledger, JANE, { resolutions, partyDecisions: [] }, JANE_STAMP);
  if (!outcome.ok) throw new Error('Jane should land once every clash is decided');
  return { base: outcome.base, ledger: outcome.ledger };
}

/** Jane's 30 clashes against a base holding Alex alone, with the party axis left open. */
export function janeClashes(): LandingClash[] {
  const alex = landAlex();
  return reviewLanding(alex.base, alex.ledger, JANE, []).units.filter(isClash);
}

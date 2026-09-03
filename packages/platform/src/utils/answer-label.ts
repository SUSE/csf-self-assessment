import type { Answer, AnswerSnapshot, Question } from '../schema';
import { rungIn } from '../assessment';

// One rung as a reader meets it — `“Regular audits by an EU body” (SEAL 2)`.
// The ONE spelling of a rung (instrument.md §3.3): a SEAL no longer identifies
// a choice, so every surface that names one names its text and keeps the SEAL
// as the gate fact it still is. `unknown rung` when the id resolves to
// nothing — unreachable for a parsed assessment, whose schema refuses the id.
export function rungLabel(question: Pick<Question, 'ladder'>, rungId: string): string {
  const rung = rungIn(question, rungId);
  return rung === undefined ? 'unknown rung' : `“${rung.description}” (SEAL ${rung.seal})`;
}

// One answer's state as a reader sees it: the rung it names, `don’t know`, or
// `n/a`. Shared by the merge screen, the ledger rows, the credibility strip and
// the report appendix.
export function answerLabel(question: Pick<Question, 'ladder'>, answer: Answer | AnswerSnapshot): string {
  switch (answer.state) {
    case 'answered':
      return rungLabel(question, answer.rungId);
    case 'dont-know':
      return 'don’t know';
    case 'na':
      return 'n/a';
  }
}

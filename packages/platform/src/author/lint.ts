import type { Seal, Workbook } from '../schema';

// Ladder lint (spec §4.3c/§4.5, audit D8 / F-10(b)): five deterministic
// checks over the definition. Sparse ladders are GAPS, never findings
// (spec §4.3c). The schema requires `role`, so the spec's "missing
// why-line/role" reduces to lint on the why-line. The hedged-quantifier
// pattern is the audit's F-10(b) regex, verbatim — its ground truth on the
// canonical workbook is 71 of 270 rungs.
// NOTE: HEDGED_QUANTIFIERS is /g — use String.match(), never regex.test()
// (a global regex's lastIndex makes .test() stateful).
export const HEDGED_QUANTIFIERS =
  /\b(most|majority|nearly all|nearly the entire|some|minor|meaningful|limited|narrow|partial(ly)?|marginal|small number|occasionally|regular(ly)?|ad hoc)\b/gi;

const COMPOUND_STEM = /\band\b/i;

export type LintFinding =
  | { kind: 'missing-why' }
  | { kind: 'compound-stem' }
  /** Every rung on this question carries this one SEAL: the floor cannot move
   *  here (spec §4.5). Fires only on a ladder of 2 or more rungs. */
  | { kind: 'flat-ladder'; seal: Seal }
  /** Two rungs read the same. `rungIds` is the stable key (spec §3.4);
   *  `positions` is the 1-based authored-order handle the pill prints, because
   *  a rung id is never shown to an author (spec §4.4). */
  | { kind: 'duplicate-rung-text'; rungIds: [string, string]; positions: [number, number] }
  | { kind: 'hedged-quantifier'; rungId: string; position: number; words: string[] };

export type QuestionLint = {
  questionId: string;
  objectiveId: string;
  findings: LintFinding[];
};

// Questions in workbook order; only questions with at least one finding
// appear. Findings order per question: missing-why, compound-stem,
// flat-ladder, then the duplicate-text and hedged findings in AUTHORED rung
// order. Nothing sorts and nothing is repaired — the lint reports.
export function ladderLint(workbook: Workbook): QuestionLint[] {
  const out: QuestionLint[] = [];
  for (const objective of workbook.objectives) {
    for (const question of objective.questions) {
      const findings: LintFinding[] = [];
      if ((question.why ?? '').trim() === '') findings.push({ kind: 'missing-why' });
      if (COMPOUND_STEM.test(question.text)) findings.push({ kind: 'compound-stem' });
      const ladder = question.ladder;
      const first = ladder[0];
      if (first !== undefined && ladder.length >= 2 && ladder.every((r) => r.seal === first.seal)) {
        findings.push({ kind: 'flat-ladder', seal: first.seal });
      }
      const seen = new Map<string, { id: string; position: number }>();
      const hedged: LintFinding[] = [];
      ladder.forEach((rung, i) => {
        const position = i + 1;
        const normalised = rung.description.trim().toLowerCase();
        const earlier = seen.get(normalised);
        if (earlier === undefined) {
          seen.set(normalised, { id: rung.id, position });
        } else {
          findings.push({
            kind: 'duplicate-rung-text',
            rungIds: [earlier.id, rung.id],
            positions: [earlier.position, position],
          });
        }
        const matches = rung.description.match(HEDGED_QUANTIFIERS) ?? [];
        const words = [...new Set(matches.map((w) => w.toLowerCase()))];
        if (words.length > 0) {
          hedged.push({ kind: 'hedged-quantifier', rungId: rung.id, position, words });
        }
      });
      findings.push(...hedged);
      if (findings.length > 0) {
        out.push({ questionId: question.id, objectiveId: objective.id, findings });
      }
    }
  }
  return out;
}

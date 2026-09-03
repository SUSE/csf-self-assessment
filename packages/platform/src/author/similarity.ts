import type { Question, Workbook } from '../schema';

// The duplicate radar: the Jaccard index over content-word
// sets. A number alone never establishes double-counting (the shared
// underlying fact stays the author's judgment); the radar only WARNS.
// Warnings start at 0.12 and the author reads them; the gauge decides
// nothing. The retired source of these numbers is recorded in
// docs/adr/0026-retire-ep-audit-oracle.md.
export const DUPLICATE_WARN_THRESHOLD = 0.12;
export const DUPLICATE_PAIR_CAP = 10;

// similarity.py STOP, verbatim ('e'/'g' are dead under the {3,} token rule
// but kept so the port stays literal).
const STOPWORDS = new Set(
  (
    'the a an of and or to for with no not is are in on by its it this that ' +
    'any under has have do does your you can be as at from than only but ' +
    'including e g eu non all'
  ).split(' '),
);

export type DuplicateWarning = {
  aId: string; // earlier question in workbook order
  bId: string;
  jaccard: number; // rounded to 3 decimals, like the audit's J()
};

// similarity.py toks(): question text + every rung description, lowercased,
// tokens matching [a-z]{3,}, minus the stopword list.
export function questionTokens(question: Question): Set<string> {
  const text = [question.text, ...question.ladder.map((r) => r.description)].join(' ');
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

// similarity.py J(): |a ∩ b| / |a ∪ b|, rounded to 3 decimals. Two empty
// token sets (blank drafts) share nothing: 0, never NaN.
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 1000) / 1000;
}

export function duplicateRadar(workbook: Workbook): DuplicateWarning[] {
  const entries = workbook.objectives
    .flatMap((o) => o.questions)
    .map((q) => ({ id: q.id, tokens: questionTokens(q) }));
  const warnings: DuplicateWarning[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const a = entries[i];
    if (!a) continue;
    for (let j = i + 1; j < entries.length; j += 1) {
      const b = entries[j];
      if (!b) continue;
      const value = jaccard(a.tokens, b.tokens);
      if (value >= DUPLICATE_WARN_THRESHOLD) {
        warnings.push({ aId: a.id, bId: b.id, jaccard: value });
      }
    }
  }
  warnings.sort(
    (x, y) => y.jaccard - x.jaccard || x.aId.localeCompare(y.aId) || x.bId.localeCompare(y.bId),
  );
  return warnings.slice(0, DUPLICATE_PAIR_CAP);
}

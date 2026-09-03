import type { DuplicateWarning, LintFinding, QuestionLint } from '../../author';

// The wording checks' words, as data. Both lists are text signals only: a number
// never establishes double-counting, and a hedged quantifier is a rung to rewrite,
// not a validation failure. Keeping the phrasing here makes it testable and keeps
// the panel presentation-only.

/** One finding, as the pill a reader scans. */
export function lintLabel(finding: LintFinding): string {
  if (finding.kind === 'missing-why') return 'missing why';
  if (finding.kind === 'compound-stem') return 'compound stem';
  if (finding.kind === 'flat-ladder') return `flat at SEAL-${finding.seal}`;
  if (finding.kind === 'duplicate-rung-text')
    return `rungs ${finding.positions[0]} & ${finding.positions[1]} read alike`;
  return `rung ${finding.position}: ${finding.words.join(', ')}`;
}

/** Why the finding is a finding — the pill's tooltip. */
export function lintReason(finding: LintFinding): string {
  if (finding.kind === 'missing-why')
    return 'No why-line: the room is told what to answer but not why it is asked.';
  if (finding.kind === 'compound-stem')
    return 'The stem asks two things, so one rung cannot answer it.';
  if (finding.kind === 'flat-ladder')
    return 'Every rung here carries the same SEAL, so this question can never move the floor.';
  if (finding.kind === 'duplicate-rung-text')
    return 'Two rungs read the same, so nobody can tell which one to pick.';
  return 'A hedged quantifier makes the rung arguable rather than checkable.';
}

/**
 * The panel's conclusion in one sentence — the same shape the recommendation
 * readout uses, so a reader reaches the verdict without passing the lists.
 */
export function checksVerdict(
  lint: QuestionLint[],
  duplicates: DuplicateWarning[],
): string {
  const findings = lint.reduce((n, entry) => n + entry.findings.length, 0);
  const parts: string[] = [];
  parts.push(
    findings === 0
      ? 'Every rung reads as checkable'
      : `${findings} finding${findings === 1 ? '' : 's'} across ${lint.length} question${lint.length === 1 ? '' : 's'}`,
  );
  parts.push(
    duplicates.length === 0
      ? 'no two questions read alike'
      : duplicates.length === 1
        ? '1 pair reads alike'
        : `${duplicates.length} pairs read alike`,
  );
  return `${parts.join(', ')}.`;
}

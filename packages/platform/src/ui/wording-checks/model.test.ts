import { describe, expect, it } from 'vitest';
import type { DuplicateWarning, LintFinding, QuestionLint } from '../../author';
import { checksVerdict, lintLabel, lintReason } from './model';

const MISSING_WHY: QuestionLint = {
  questionId: 'SOV-2.q1',
  objectiveId: 'SOV-2',
  findings: [{ kind: 'missing-why' }],
};

const TWO_FINDINGS: QuestionLint = {
  questionId: 'SOV-6.q5',
  objectiveId: 'SOV-6',
  findings: [
    { kind: 'compound-stem' },
    { kind: 'hedged-quantifier', rungId: 'choice-2', position: 2, words: ['most', 'partially'] },
  ],
};

const PAIR: DuplicateWarning = { aId: 'SOV-2.q1', bId: 'SOV-6.q5', jaccard: 0.198 };

describe('lintLabel', () => {
  it('names each finding kind, and a hedged rung names its rung and its words', () => {
    expect(lintLabel({ kind: 'missing-why' })).toBe('missing why');
    expect(lintLabel({ kind: 'compound-stem' })).toBe('compound stem');
    expect(lintLabel({ kind: 'flat-ladder', seal: 4 })).toBe('flat at SEAL-4');
    expect(
      lintLabel({ kind: 'duplicate-rung-text', rungIds: ['choice-1', 'choice-3'], positions: [1, 3] }),
    ).toBe('rungs 1 & 3 read alike');
    expect(
      lintLabel({ kind: 'hedged-quantifier', rungId: 'choice-3', position: 3, words: ['some', 'ad hoc'] }),
    ).toBe('rung 3: some, ad hoc');
  });

  it('every kind has a reason, so a pill is never unexplained', () => {
    const everyKind: LintFinding[] = [
      { kind: 'missing-why' },
      { kind: 'compound-stem' },
      { kind: 'flat-ladder', seal: 4 },
      { kind: 'duplicate-rung-text', rungIds: ['choice-1', 'choice-3'], positions: [1, 3] },
      { kind: 'hedged-quantifier', rungId: 'choice-2', position: 2, words: ['most'] },
    ];
    for (const finding of everyKind) {
      expect(lintReason(finding).length).toBeGreaterThan(0);
    }
  });
});

describe('checksVerdict', () => {
  it('counts FINDINGS, not questions — two on one question is two', () => {
    expect(checksVerdict([TWO_FINDINGS], [])).toBe(
      '2 findings across 1 question, no two questions read alike.',
    );
  });

  it('a single finding and a single pair read singular', () => {
    expect(checksVerdict([MISSING_WHY], [PAIR])).toBe(
      '1 finding across 1 question, 1 pair reads alike.',
    );
  });

  it('a clean instrument says so on both counts', () => {
    expect(checksVerdict([], [])).toBe(
      'Every rung reads as checkable, no two questions read alike.',
    );
  });

  it('plural pairs', () => {
    expect(checksVerdict([], [PAIR, PAIR])).toBe(
      'Every rung reads as checkable, 2 pairs read alike.',
    );
  });
});

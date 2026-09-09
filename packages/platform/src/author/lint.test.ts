import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { estateWorkbook } from './estate-workbook-fixture';
import { ladderLint } from './lint';

const wbOf = (
  questions: {
    id: string;
    text: string;
    why?: string;
    rungs: [0 | 1 | 2 | 3 | 4, number, string][];
  }[],
): Workbook => ({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  frontSheet: [],
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 1, name: 'S1', description: 'd' },
    { seal: 2, name: 'S2', description: 'd' },
    { seal: 3, name: 'S3', description: 'd' },
    { seal: 4, name: 'S4', description: 'd' },
  ],
  dimensions: [],
  roles: [],
  parties: [],
  objectives: [
    {
      id: 'SOV-1',
      name: 'One',
      weight: 100,
      questions: questions.map((q) => ({
        id: q.id,
        grain: 'party' as const,
        axis: 'assessment' as const,
        text: q.text,
        ...(q.why === undefined ? {} : { why: q.why }),
        role: 'ARCH' as const,
        defaultMateriality: 'material' as const,
        ladder: q.rungs.map(([seal, points, description], i) => ({
          id: `choice-${i + 1}`,
          description,
          points,
          seal,
        })),
      })),
    },
  ],
  testEstates: [],
  recommendations: [],
});

describe('ladder lint (S9b)', () => {
  it('the shipped instrument is lint-clean', () => {
    const wb = estateWorkbook();
    expect(wb.objectives.flatMap((o) => o.questions)).toHaveLength(35);
    expect(ladderLint(wb)).toEqual([]);
  });

  it('hedged words: matched, lowercased, deduped, in match order', () => {
    const wb = wbOf([
      {
        id: 'q-1',
        text: 'Clean?',
        why: 'w',
        rungs: [[0, 0, 'Most workloads are regularly patched, ad hoc, like most estates']],
      },
    ]);
    const result = ladderLint(wb);
    expect(result).toHaveLength(1);
    const finding = result[0].findings[0];
    expect(finding.kind).toBe('hedged-quantifier');
    if (finding.kind === 'hedged-quantifier') {
      expect(finding.words).toEqual(['most', 'regularly', 'ad hoc']);
    }
  });

  it('compound stem flags " and " in the question text only', () => {
    const flagged = ladderLint(
      wbOf([{ id: 'q-1', text: 'Keys and certificates are managed?', why: 'w', rungs: [[0, 0, 'nothing done'], [4, 100, 'fully done']] }]),
    );
    expect(flagged).toHaveLength(1);
    expect(flagged[0].findings).toEqual([{ kind: 'compound-stem' }]);
    const android = ladderLint(
      wbOf([{ id: 'q-1', text: 'Is android device custody controlled?', why: 'w', rungs: [[0, 0, 'nothing done'], [4, 100, 'fully done']] }]),
    );
    expect(android).toEqual([]);
  });

  it('missing why, blank or absent', () => {
    const blank = ladderLint(
      wbOf([{ id: 'q-1', text: 'Clean question?', why: '  ', rungs: [[0, 0, 'nothing done'], [4, 100, 'fully done']] }]),
    );
    expect(blank).toHaveLength(1);
    expect(blank[0].findings[0]).toEqual({ kind: 'missing-why' });

    const absent = ladderLint(
      wbOf([{ id: 'q-1', text: 'Clean question?', rungs: [[0, 0, 'nothing done'], [4, 100, 'fully done']] }]),
    );
    expect(absent[0].findings[0]).toEqual({ kind: 'missing-why' });
  });

  it('sparse ladders are not findings', () => {
    const result = ladderLint(
      wbOf([{ id: 'q-1', text: 'Clean question?', why: 'w', rungs: [[0, 0, 'nothing done'], [4, 100, 'fully done']] }]),
    );
    expect(result).toEqual([]);
  });

  it('flat ladder: every rung at one SEAL cannot move the floor', () => {
    const result = ladderLint(
      wbOf([
        {
          id: 'q-1',
          text: 'Clean?',
          why: 'w',
          rungs: [
            [4, 0, 'one'],
            [4, 40, 'two'],
            [4, 80, 'three'],
            [4, 120, 'four'],
            [4, 160, 'five'],
          ],
        },
      ]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].findings).toEqual([{ kind: 'flat-ladder', seal: 4 }]);
  });

  it('a two-SEAL ladder and a one-rung ladder are not flat findings', () => {
    expect(
      ladderLint(wbOf([{ id: 'q-1', text: 'Clean?', why: 'w', rungs: [[0, 0, 'one'], [4, 100, 'two']] }])),
    ).toEqual([]);
    expect(
      ladderLint(wbOf([{ id: 'q-1', text: 'Clean?', why: 'w', rungs: [[4, 0, 'one']] }])),
    ).toEqual([]);
  });

  it('duplicate rung text pairs each repeat with its first occurrence', () => {
    const two = ladderLint(
      wbOf([
        {
          id: 'q-1',
          text: 'Clean?',
          why: 'w',
          rungs: [
            [0, 0, 'No disclosure'],
            [1, 25, 'something else'],
            [2, 50, ' no disclosure '],
          ],
        },
      ]),
    );
    expect(two[0].findings).toEqual([
      { kind: 'duplicate-rung-text', rungIds: ['choice-1', 'choice-3'], positions: [1, 3] },
    ]);

    const three = ladderLint(
      wbOf([
        {
          id: 'q-1',
          text: 'Clean?',
          why: 'w',
          rungs: [
            [0, 0, 'No disclosure'],
            [1, 25, 'something else'],
            [2, 50, 'No disclosure'],
            [3, 75, 'No disclosure'],
          ],
        },
      ]),
    );
    expect(three[0].findings).toEqual([
      { kind: 'duplicate-rung-text', rungIds: ['choice-1', 'choice-3'], positions: [1, 3] },
      { kind: 'duplicate-rung-text', rungIds: ['choice-1', 'choice-4'], positions: [1, 4] },
    ]);
  });

  it('hedged findings key by rung position, not by SEAL', () => {
    const result = ladderLint(
      wbOf([
        {
          id: 'q-1',
          text: 'Clean?',
          why: 'w',
          rungs: [
            [4, 0, 'Most controls missing'],
            [4, 40, 'clean rung text'],
            [4, 80, 'partial coverage exists'],
          ],
        },
      ]),
    );
    const hedged = result[0].findings.flatMap((f) => (f.kind === 'hedged-quantifier' ? [f] : []));
    expect(hedged.map((f) => f.position)).toEqual([1, 3]);
    expect(hedged.map((f) => f.rungId)).toEqual(['choice-1', 'choice-3']);
  });

  it('findings order and question order', () => {
    const result = ladderLint(
      wbOf([
        {
          id: 'q-1',
          text: 'Keys and certificates?',
          why: '',
          rungs: [
            [4, 0, 'nothing done'],
            [4, 40, 'Most controls missing'],
            [4, 80, 'nothing done'],
            [4, 120, 'partial coverage exists'],
          ],
        },
      ]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].findings.map((f) => f.kind)).toEqual([
      'missing-why',
      'compound-stem',
      'flat-ladder',
      'duplicate-rung-text',
      'hedged-quantifier',
      'hedged-quantifier',
    ]);
  });
});

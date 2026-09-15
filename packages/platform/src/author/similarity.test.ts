import { describe, expect, it } from 'vitest';
import type { Workbook } from '../schema';
import { estateWorkbook } from './estate-workbook-fixture';
import { DUPLICATE_PAIR_CAP, duplicateRadar, jaccard, questionTokens } from './similarity';

const wbOf = (questions: { id: string; text: string; rungs: string[] }[]): Workbook => ({
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  frontSheet: [],
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
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
        why: 'w',
        role: 'ARCH' as const,
        defaultMateriality: 'material' as const,
        ladder: q.rungs.map((description, i) => ({ id: `choice-${i + 1}`, description, points: i === 0 ? 0 : 100, seal: i === 0 ? (0 as const) : (4 as const) })),
      })),
    },
  ],
  testEstates: [],
  recommendations: [],
});

describe('duplicate radar (S9b)', () => {
  it('questionTokens: lowercased, [a-z]{3,}, stopwords out', () => {
    const wb = wbOf([
      { id: 'q-1', text: 'The provider AND the operator?', rungs: ['No SBOM at all', 'Own e.g. 100 SBOMs'] },
    ]);
    const question = wb.objectives[0].questions[0];
    expect(questionTokens(question)).toEqual(new Set(['provider', 'operator', 'sbom', 'own', 'sboms']));
  });

  it('jaccard: identical sets → 1, disjoint → 0, empty∪empty → 0', () => {
    expect(jaccard(new Set(['alpha', 'beta']), new Set(['alpha', 'beta']))).toBe(1);
    expect(jaccard(new Set(['alpha']), new Set(['beta']))).toBe(0);
    expect(jaccard(new Set<string>(), new Set<string>())).toBe(0);
    expect(jaccard(new Set(['alpha', 'beta']), new Set(['alpha']))).toBe(0.5);
  });

  it('the shipped instrument: jaccard reproduces on named pairs', () => {
    const wb = estateWorkbook();
    const tokensById = new Map(
      wb.objectives.flatMap((o) => o.questions).map((q) => [q.id, questionTokens(q)]),
    );
    const t = (id: string) => {
      const tokens = tokensById.get(id);
      if (tokens === undefined) throw new Error(`no question ${id}`);
      return tokens;
    };
    expect(jaccard(t('SOV-4.workload-portability'), t('SOV-6.exit-rehearsal'))).toBe(0.177);
    expect(jaccard(t('SOV-5.chain-visibility'), t('SOV-6.licence-rights'))).toBe(0.13);
  });

  it('radar on the shipped instrument: sorted desc, capped, top pair', () => {
    const warnings = duplicateRadar(estateWorkbook());
    expect(warnings.length).toBe(DUPLICATE_PAIR_CAP);
    for (let i = 1; i < warnings.length; i += 1) {
      expect(warnings[i - 1].jaccard).toBeGreaterThanOrEqual(warnings[i].jaccard);
    }
    expect(warnings[0]).toEqual({
      aId: 'SOV-3.model-portability',
      bId: 'SOV-6.licence-rights',
      jaccard: 0.186,
    });
  });

  it('pairs below 0.12 are silent', () => {
    const wb = wbOf([
      { id: 'q-1', text: 'Encryption keys custody?', rungs: ['nobody holds keys', 'institution holds keys'] },
      { id: 'q-2', text: 'Contract termination clause?', rungs: ['zero notice given', 'twelve months notice'] },
    ]);
    expect(duplicateRadar(wb)).toEqual([]);
  });

  it('identical questions → J 1', () => {
    const wb = wbOf([
      { id: 'q-1', text: 'Encryption keys custody?', rungs: ['nobody holds keys', 'institution holds keys'] },
      { id: 'q-2', text: 'Encryption keys custody?', rungs: ['nobody holds keys', 'institution holds keys'] },
    ]);
    const warnings = duplicateRadar(wb);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].jaccard).toBe(1);
  });
});

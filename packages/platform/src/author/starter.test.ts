import { describe, expect, it } from 'vitest';
import { DraftWorkbookSchema, WorkbookSchema } from '../schema';
import { starterWorkbook } from './starter';

describe('starterWorkbook', () => {
  it('is draft-valid', () => {
    expect(DraftWorkbookSchema.safeParse(starterWorkbook()).success).toBe(true);
  });

  it('is strict-invalid in exactly the 8 empty-questions ways', () => {
    const result = WorkbookSchema.safeParse(starterWorkbook());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.length).toBe(8);
    result.error.issues.forEach((issue, i) => {
      expect(issue.path).toEqual(['objectives', i, 'questions']);
    });
  });

  it('carries the EC defaults', () => {
    const wb = starterWorkbook();
    expect(wb.objectives.map((o) => o.weight)).toEqual([20, 10, 10, 15, 10, 15, 15, 5]);
    expect(wb.objectives.reduce((sum, o) => sum + o.weight, 0)).toBe(100);
    expect(wb.dimensions.length).toBe(10);
    expect(wb.dimensions.filter((d) => d.critical).map((d) => d.id)).toEqual([
      'compute',
      'storage',
      'network',
      'iam',
      'platform',
      'security',
    ]);
    expect(wb.dimensions.find((d) => d.id === 'compute')?.critical).toBe(true);
    expect(wb.dimensions.find((d) => d.id === 'edge')?.critical).toBe(false);
    expect(wb.dimensions.find((d) => d.id === 'facilities')?.critical).toBe(false);
    expect(wb.dimensions.every((d) => !('defaultDeclared' in d))).toBe(true);
    expect(wb.dimensions.find((d) => d.id === 'compute')?.strata).toEqual([
      'service',
      'software',
      'hardware',
      'chips',
    ]);
    expect(wb.dimensions.find((d) => d.id === 'storage')?.strata).toEqual([
      'service',
      'software',
      'hardware',
      'chips',
    ]);
    expect(wb.sealLevels.map((l) => l.seal)).toEqual([0, 1, 2, 3, 4]);
    expect(starterWorkbook().parties.filter((p) => p.kind === 'assessed')).toHaveLength(1);
  });
});

describe('starterWorkbook — test estates (S9b)', () => {
  it('ships Profile A / BASE / M, answers empty', () => {
    const wb = starterWorkbook();
    expect(wb.testEstates.map((e) => e.id)).toEqual(['profile-a', 'profile-base', 'profile-m']);
    expect(wb.testEstates.map((e) => e.name)).toEqual(['Profile A', 'Profile BASE', 'Profile M']);
    for (const estate of wb.testEstates) expect(estate.answers).toEqual([]);
  });

  it('test estates carry only parties (no profile); parties per story', () => {
    const wb = starterWorkbook();
    for (const estate of wb.testEstates) {
      expect('profile' in estate).toBe(false);
      expect(Array.isArray(estate.parties)).toBe(true);
    }
    const [a, base, m] = wb.testEstates;
    expect(base.parties).toHaveLength(1);
    expect(base.parties[0].type).toBe('institution');
    const hyperscaler = a.parties.find((p) => p.type === 'primary-provider');
    expect(hyperscaler?.serves).toEqual([
      'compute',
      'storage',
      'network',
      'iam',
      'platform',
      'aiml',
      'software-supply',
      'security',
    ]);
    const provider = m.parties.find((p) => p.type === 'primary-provider');
    expect(provider?.serves).toEqual(['compute', 'storage', 'network']);
  });

  it('starter estates add no strict issues', () => {
    const result = WorkbookSchema.safeParse(starterWorkbook());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.length).toBe(8);
    for (const issue of result.error.issues) {
      expect(issue.path[0]).not.toBe('testEstates');
    }
  });
});

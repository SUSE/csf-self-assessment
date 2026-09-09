import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DraftWorkbookSchema, WorkbookSchema, issuesUnder } from './index';
import type { Workbook } from './index';
import { PARTIES, ROLES } from './fixtures';

const tinyValid = {
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [
    { seal: 0, name: 'None', description: 'none' },
    { seal: 4, name: 'Full', description: 'full' },
  ],
  dimensions: [{ id: 'compute', name: 'Compute', critical: true }],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'O1',
      name: 'One',
      weight: 100,
      questions: [
        {
          id: 'q-1',
          grain: 'party',
          text: 't',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [{ id: 'choice-1', description: 'd', points: 0, seal: 0 }],
        },
      ],
    },
  ],
};

describe('DraftWorkbookSchema', () => {
  it('draft type equals Workbook, both ways', () => {
    type Draft = z.infer<typeof DraftWorkbookSchema>;
    const toWorkbook = (d: Draft): Workbook => d;
    const toDraft = (w: Workbook): Draft => w;
    expect(toWorkbook).toBeDefined();
    expect(toDraft).toBeDefined();
  });

  it('accepts what the strict schema accepts', () => {
    expect(DraftWorkbookSchema.safeParse(tinyValid).success).toBe(true);
    expect(WorkbookSchema.safeParse(tinyValid).success).toBe(true);
  });

  it('accepts strict-invalid mid-edit states', () => {
    const midEdit = structuredClone(tinyValid);
    midEdit.objectives[0].weight = 40;
    midEdit.objectives[0].questions[0].text = '';
    midEdit.objectives[0].questions[0].ladder = [];
    midEdit.objectives.push({ id: 'O2', name: '', weight: 0, questions: [] });
    expect(DraftWorkbookSchema.safeParse(midEdit).success).toBe(true);
    expect(WorkbookSchema.safeParse(midEdit).success).toBe(false);
  });

  it('applies the same defaults as the strict schema', () => {
    const clone = structuredClone(tinyValid) as Record<string, unknown> & typeof tinyValid;
    delete (clone.objectives[0].questions[0] as Record<string, unknown>).axis;
    const parsed = DraftWorkbookSchema.parse(clone);
    expect(parsed.objectives[0].questions[0]).toHaveProperty('axis', 'assessment');
  });

  it('refuses structural malformation', () => {
    const badGrain = structuredClone(tinyValid);
    (badGrain.objectives[0].questions[0] as Record<string, unknown>).grain = 'bogus';
    expect(DraftWorkbookSchema.safeParse(badGrain).success).toBe(false);
    const badSeal = structuredClone(tinyValid);
    (badSeal.objectives[0].questions[0].ladder[0] as Record<string, unknown>).seal = 7;
    expect(DraftWorkbookSchema.safeParse(badSeal).success).toBe(false);
  });
});

describe('issuesUnder', () => {
  const invalid = structuredClone(tinyValid);
  invalid.objectives[0].questions[0].ladder = [];
  invalid.objectives[0].weight = 40;
  const result = WorkbookSchema.safeParse(invalid);
  const issues = result.success ? [] : result.error.issues;

  it('returns the issues at or under a question prefix', () => {
    const scoped = issuesUnder(issues, ['objectives', 0, 'questions', 0]);
    expect(scoped.length).toBeGreaterThanOrEqual(1);
    for (const issue of scoped) {
      expect(issue.path.slice(0, 4)).toEqual(['objectives', 0, 'questions', 0]);
    }
  });

  it('returns [] for a prefix owning no issues', () => {
    expect(issuesUnder(issues, ['objectives', 0, 'questions', 1])).toEqual([]);
  });

  it('an empty prefix returns every issue', () => {
    expect(issuesUnder(issues, []).length).toBe(issues.length);
  });
});

describe('DraftWorkbookSchema — mid-typing prose', () => {
  it('accepts a blank objective description and a blank why', () => {
    const draft = {
      ...tinyValid,
      objectives: [
        {
          ...tinyValid.objectives[0],
          description: '',
          questions: [{ ...tinyValid.objectives[0].questions[0], why: '' }],
        },
      ],
    };
    expect(DraftWorkbookSchema.safeParse(draft).success).toBe(true);
  });
});

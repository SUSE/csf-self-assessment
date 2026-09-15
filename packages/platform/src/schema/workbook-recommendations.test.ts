import { describe, expect, it } from 'vitest';
import { DraftWorkbookSchema, WorkbookSchema } from './index';
import { BASE } from './fixtures';

const REC = {
  id: 'r1',
  title: 'T',
  action: 'A',
  body: ['p'],
  links: [{ kind: 'objective', id: 'SOV-2' }],
  whenAtOrBelow: 2,
  horizon: 'strategic',
  order: 0,
};
const RECOMMENDER = { name: 'V', disclosure: 'D' };

const authored = (recommendations: unknown[]) => ({ ...BASE, recommendations, recommender: RECOMMENDER });

describe('recommendations (R18–R21)', () => {
  it('defaults to no recommendations and no recommender', () => {
    const parsed = WorkbookSchema.parse(BASE);
    expect(parsed.recommendations).toEqual([]);
    expect('recommender' in parsed).toBe(false);
  });

  it('parses an authored recommendation with its recommender', () => {
    const parsed = WorkbookSchema.parse(authored([REC]));
    expect(parsed.recommendations[0].links[0]).toEqual({ kind: 'objective', id: 'SOV-2' });
    expect(parsed.recommendations[0].horizon).toBe('strategic');
  });

  it('R18 — rejects duplicate recommendation ids', () => {
    expect(WorkbookSchema.safeParse(authored([REC, { ...REC, title: 'T2' }])).success).toBe(false);
  });

  it('R19 — rejects a link to an unknown objective', () => {
    expect(
      WorkbookSchema.safeParse(authored([{ ...REC, links: [{ kind: 'objective', id: 'GHOST' }] }])).success,
    ).toBe(false);
  });

  it('R19 — a question link resolves against the question ids', () => {
    expect(
      WorkbookSchema.safeParse(authored([{ ...REC, links: [{ kind: 'question', id: 'SOV-2.q1' }] }])).success,
    ).toBe(true);
  });

  it('R20 — rejects a threshold SEAL with no declared level', () => {
    expect(WorkbookSchema.safeParse(authored([{ ...REC, whenAtOrBelow: 3 }])).success).toBe(false);
  });

  it('R21 — recommendations require a recommender', () => {
    expect(WorkbookSchema.safeParse({ ...BASE, recommendations: [REC] }).success).toBe(false);
    expect(WorkbookSchema.safeParse(authored([REC])).success).toBe(true);
  });

  it('the draft twin accepts empty strings and no links', () => {
    expect(
      DraftWorkbookSchema.safeParse({
        ...BASE,
        recommendations: [{ ...REC, id: '', title: '', links: [] }],
        recommender: { name: '', disclosure: '' },
      }).success,
    ).toBe(true);
    expect(DraftWorkbookSchema.parse(BASE).recommendations).toEqual([]);
  });
});

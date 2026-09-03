import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { WORKBOOK_RULES } from './workbook-rules';
import type { Workbook } from './workbook';
import { BASE, DIM } from './fixtures';

// The point of the rule table: run ONE rule against a fixture, without
// round-tripping the whole schema. The stub ctx collects messages; the rules
// only ever call addIssue.
function run(id: string, wb: unknown): string[] {
  const rule = WORKBOOK_RULES.find((r) => r.id === id);
  if (rule === undefined) throw new Error(`No rule ${id} in the table.`);
  const messages: string[] = [];
  const ctx = { addIssue: (i: { message?: string }) => messages.push(i.message ?? '') };
  rule.check(wb as Workbook, ctx as unknown as z.RefinementCtx);
  return messages;
}

// The rules read fields the schema defaults, so a raw fixture needs them filled.
const workbook = (over: Record<string, unknown> = {}) => ({
  ...BASE,
  dimensions: [],
  testEstates: [],
  recommendations: [],
  ...over,
});

describe('WORKBOOK_RULES', () => {
  it('cites every rule id exactly once, R12 retired', () => {
    const ids = WORKBOOK_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('R12');
    expect(ids).toContain('R1');
    expect(ids).toContain('R23');
  });

  it('names every rule', () => {
    expect(WORKBOOK_RULES.every((r) => r.name.length > 0)).toBe(true);
  });

  it('R1 holds on a valid workbook and fails on a short total', () => {
    expect(run('R1', workbook())).toEqual([]);
    const clone = workbook();
    clone.objectives = [{ ...clone.objectives[0], weight: 90 }];
    expect(run('R1', clone)).toEqual(['Objective weights must sum to 100; got 90.']);
  });

  it('R22 catches points that fall, and only that rung', () => {
    const clone = structuredClone(workbook());
    clone.objectives[0].questions[0].ladder[2].points = 10;
    const messages = run('R22', clone);
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain('drops in points at rung 3');
  });

  it('R6 resolves appliesTo against the declared dimensions', () => {
    const clone = structuredClone(workbook({ dimensions: [DIM] }));
    clone.objectives[0].questions.push({
      id: 'SOV-2.d1',
      grain: 'dimension',
      appliesTo: ['storage'],
      text: 'q?',
      why: 'b',
      role: 'OPS',
      defaultMateriality: 'material',
      ladder: [{ id: 'choice-1', description: 'r0', points: 0, seal: 0 }],
    } as never);
    expect(run('R6', clone)).toEqual([
      'Question SOV-2.d1 applies to unknown dimension "storage".',
    ]);
  });

  it('R16 requires exactly one assessed party type', () => {
    expect(run('R16', workbook())).toEqual([]);
    const clone = structuredClone(workbook());
    clone.parties[1].kind = 'assessed';
    expect(run('R16', clone)).toEqual([
      "Exactly one party type must have kind 'assessed'; found 2.",
    ]);
  });
});

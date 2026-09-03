import { describe, expect, it } from 'vitest';
import { WorkbookAssessmentSchema } from './index';
import { BASE, INST, messagesOf } from './fixtures';

const WA = {
  meta: {
    id: 'wa-1',
    estate: 'Fixture estate',
    workbookId: 'wb',
    workbookVersion: '1.0.0',
    createdAt: '2026-08-02T00:00:00.000Z',
  },
  workbook: BASE,
  parties: [INST],
};

describe('WorkbookAssessmentSchema (delivery-S2)', () => {
  it('a workbook-assessment parses; parties are embedded', () => {
    const parsed = WorkbookAssessmentSchema.parse(WA);
    expect(parsed.meta.id).toBe('wa-1');
    expect(parsed.parties).toEqual([INST]);
    expect(parsed.workbook.meta.id).toBe('wb');
  });

  it('refuses two assessed parties', () => {
    const parties = [INST, { id: 'inst2', name: 'I2', type: 'institution', serves: [] }];
    const messages = messagesOf(WorkbookAssessmentSchema.safeParse({ ...WA, parties }));
    expect(messages.some((m) => /Exactly one party must be the assessed/.test(m))).toBe(true);
  });

  it('refuses an unknown party type', () => {
    const parties = [INST, { id: 'x', name: 'X', type: 'nope', serves: [] }];
    const messages = messagesOf(WorkbookAssessmentSchema.safeParse({ ...WA, parties }));
    expect(messages.some((m) => /unknown party type/.test(m))).toBe(true);
  });
});

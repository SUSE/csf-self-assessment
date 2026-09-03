import { describe, expect, it } from 'vitest';
import { DraftWorkbookSchema, WorkbookSchema } from './index';
import { PARTIES, ROLES, messagesOf } from './fixtures';

const S9B_BASE = {
  meta: { id: 'wb', version: '1.0.0', title: 'T' },
  sealLevels: [
    { seal: 0, name: 'S0', description: 'd' },
    { seal: 4, name: 'S4', description: 'd' },
  ],
  dimensions: [{ id: 'compute', name: 'Compute', critical: true }],
  roles: ROLES,
  parties: PARTIES,
  objectives: [
    {
      id: 'SOV-1',
      name: 'One',
      weight: 100,
      questions: [
        {
          id: 'q-1',
          grain: 'dimension',
          appliesTo: ['compute'],
          text: 'T?',
          why: 'w',
          role: 'ARCH',
          defaultMateriality: 'material',
          ladder: [
            { id: 'choice-1', description: 'none', points: 0, seal: 0 },
            { id: 'choice-2', description: 'full', points: 100, seal: 4 },
          ],
        },
      ],
    },
  ],
};

const ESTATE = {
  id: 'profile-base',
  name: 'Profile BASE',
  description: 'EU stack.',
  parties: [],
  answers: [{ questionId: 'q-1', rungId: 'choice-1' }],
};

const refusalOf = (estates: unknown[]): string[] =>
  messagesOf(WorkbookSchema.safeParse({ ...S9B_BASE, testEstates: estates }));

describe('test estates (S9b)', () => {
  it('parses a workbook with a test estate; testEstates defaults to []', () => {
    expect(WorkbookSchema.parse({ ...S9B_BASE, testEstates: [ESTATE] }).testEstates).toHaveLength(1);
    expect(WorkbookSchema.parse(S9B_BASE).testEstates).toEqual([]);
  });

  it('defaults a test estate parties to []', () => {
    const parsed = WorkbookSchema.parse({
      ...S9B_BASE,
      testEstates: [{ id: 'e', name: 'E', description: 'd', answers: [] }],
    });
    expect(parsed.testEstates[0].parties).toEqual([]);
  });

  it('R9 — duplicate estate ids rejected', () => {
    expect(refusalOf([ESTATE, { ...ESTATE, name: 'Other' }])).toContain('Test-estate ids must be unique.');
  });

  it('R10 — unknown questionId rejected', () => {
    expect(refusalOf([{ ...ESTATE, answers: [{ questionId: 'q-9', rungId: 'choice-1' }] }])).toContain(
      'Estate profile-base answers unknown question "q-9".',
    );
  });

  it('R10 — double answer for one question rejected', () => {
    const twice = [
      { questionId: 'q-1', rungId: 'choice-1' },
      { questionId: 'q-1', rungId: 'choice-2' },
    ];
    expect(refusalOf([{ ...ESTATE, answers: twice }])).toContain(
      'Estate profile-base answers question "q-1" more than once.',
    );
  });

  it('R11 — unauthored rung id rejected', () => {
    expect(
      refusalOf([{ ...ESTATE, answers: [{ questionId: 'q-1', rungId: 'choice-9' }] }]),
    ).toContain(
      'Estate profile-base answers q-1 at rung "choice-9", which that ladder does not author.',
    );
  });

  it('R17 — unknown party type rejected', () => {
    expect(refusalOf([{ ...ESTATE, parties: [{ id: 'p', name: 'P', type: 'nope', serves: [] }] }])).toContain(
      'Estate profile-base party p has unknown party type "nope".',
    );
  });

  it('R17 — unknown serves rejected', () => {
    const party = { id: 'p', name: 'P', type: 'primary-provider', serves: ['ghost'] };
    expect(refusalOf([{ ...ESTATE, parties: [party] }])).toContain(
      'Estate profile-base party p serves unknown dimension "ghost".',
    );
  });

  it('draft accepts a mid-edit estate', () => {
    const midEdit = {
      ...S9B_BASE,
      testEstates: [{ ...ESTATE, name: '', description: '', answers: [{ questionId: 'q-missing', rungId: 'choice-1' }] }],
    };
    expect(DraftWorkbookSchema.safeParse(midEdit).success).toBe(true);
  });
});

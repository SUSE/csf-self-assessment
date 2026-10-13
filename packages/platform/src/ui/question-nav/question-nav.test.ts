import { describe, expect, it } from 'vitest';
import type { NavGroup, NavQuestion } from './types';

type Flat = { q: NavQuestion; group: NavGroup; indexInGroup: number };

function flattenGroups(groups: NavGroup[]): Flat[] {
  return groups.flatMap((g) => g.questions.map((q, i) => ({ q, group: g, indexInGroup: i })));
}

function resolveActive(flat: Flat[], activeId: string): Flat | undefined {
  const activeIdx = activeId ? flat.findIndex((f) => f.q.id === activeId) : -1;
  return activeIdx >= 0 ? flat[activeIdx] : undefined;
}

describe('question-nav active resolution', () => {
  const groups: NavGroup[] = [
    {
      id: 'SOV-1',
      code: 'SOV-1',
      name: 'Data & AI',
      questions: [
        { id: 'q-1', text: 'Q1', tone: 'none', fraction: 0 },
        { id: 'q-2', text: 'Q2', tone: 'none', fraction: 0 },
      ],
    },
    {
      id: 'SOV-2',
      code: 'SOV-2',
      name: 'Operations',
      questions: [],
    },
    {
      id: 'SOV-3',
      code: 'SOV-3',
      name: 'Architecture',
      questions: [{ id: 'q-3', text: 'Q3', tone: 'none', fraction: 0 }],
    },
  ];

  const flat = flattenGroups(groups);

  it('resolves active question when activeId exists in groups', () => {
    const active = resolveActive(flat, 'q-1');
    expect(active?.q.id).toBe('q-1');
    expect(active?.group.id).toBe('SOV-1');
    expect(active?.indexInGroup).toBe(0);
  });

  it('resolves to undefined when activeId is empty (e.g. objective without questions selected)', () => {
    const active = resolveActive(flat, '');
    expect(active).toBeUndefined();
  });

  it('resolves to undefined when activeId does not exist in groups', () => {
    const active = resolveActive(flat, 'nonexistent');
    expect(active).toBeUndefined();
  });

  it('identifies groups without questions so the user can select them', () => {
    const emptyGroups = groups.filter((g) => g.questions.length === 0);
    expect(emptyGroups.map((g) => g.id)).toEqual(['SOV-2']);
  });
});

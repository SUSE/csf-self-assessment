import { describe, expect, it } from 'vitest';
import type { GroupMounting } from './detail-layout';
import {
  PANEL_RESERVE_PX,
  groupMountings,
  groupRenderings,
  landingDetail,
  panelOf,
} from './detail-layout';
import { BIG, BIG_LEDGER, ctx } from './detail-fixture';

const detail = landingDetail(BIG, BIG_LEDGER, ctx);

const refIn = (groupId: string) => {
  const group = detail.groups.find((g) => g.id === groupId);
  if (group === undefined) throw new Error(`no group ${groupId}`);
  return group.panels[0].ref;
};

const entry = (mountings: GroupMounting[], id: string): GroupMounting => {
  const found = mountings.find((m) => m.group.id === id);
  if (found === undefined) throw new Error(`no group ${id}`);
  return found;
};

const mountingsWith = (approaching: Record<string, boolean>, selected: ReturnType<typeof refIn> | null = null) =>
  groupMountings(groupRenderings(detail.groups, selected, {}, false), approaching);

describe('what the changes column mounts', () => {
  it('a rendering says which group holds the anchor', () => {
    expect(
      groupRenderings(detail.groups, refIn('agreements:SOV-1'), {}, false).map((r) => [r.group.id, r.holdsSelected]),
    ).toEqual([
      ['parties', false],
      ['SOV-1', false],
      ['SOV-2', false],
      ['unplaced', false],
      ['agreements:SOV-1', true],
    ]);
    expect(groupRenderings(detail.groups, null, {}, false).every((r) => r.holdsSelected === false)).toBe(true);
  });

  it('nothing mounts before a group approaches, and open groups hold their place', () => {
    const mountings = mountingsWith({});
    expect(mountings.every((m) => m.mounted === false)).toBe(true);
    for (const id of ['parties', 'SOV-1', 'SOV-2', 'unplaced']) {
      const one = entry(mountings, id);
      expect(one.reserve).toBe(one.group.panels.length * PANEL_RESERVE_PX);
    }
    expect(entry(mountings, 'agreements:SOV-1').reserve).toBe(0);
  });

  it('a group that approached the viewport mounts and stops reserving', () => {
    const mountings = mountingsWith({ 'SOV-2': true });
    expect(entry(mountings, 'SOV-2').mounted).toBe(true);
    expect(entry(mountings, 'SOV-2').reserve).toBe(0);
    expect(entry(mountings, 'parties').mounted).toBe(false);
    expect(entry(mountings, 'parties').reserve).toBe(PANEL_RESERVE_PX);
  });

  it('the group holding the anchor mounts without approaching', () => {
    const mountings = mountingsWith({}, refIn('SOV-2'));
    expect(entry(mountings, 'SOV-2').mounted).toBe(true);
    expect(entry(mountings, 'SOV-2').reserve).toBe(0);
    expect(mountings.filter((m) => m.mounted).map((m) => m.group.id)).toEqual(['SOV-2']);
  });

  it('a closed group never mounts and never reserves, however near it is', () => {
    const agreements = entry(mountingsWith({ 'agreements:SOV-1': true }), 'agreements:SOV-1');
    expect(agreements.open).toBe(false);
    expect(agreements.mounted).toBe(false);
    expect(agreements.reserve).toBe(0);
  });

  it('a ref names its panel', () => {
    expect(panelOf(detail.groups, null)).toBeNull();
    expect(panelOf(detail.groups, refIn('SOV-2'))?.label).toBe('SOV-2.q1 · whole estate');
    expect(panelOf(detail.groups, { kind: 'party', party: 'nope' })).toBeNull();
  });
});

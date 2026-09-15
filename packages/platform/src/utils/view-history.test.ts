import { describe, expect, it } from 'vitest';
import { readView } from './view-history';

// readView is the pure, DOM-free core of the view store: given a raw history-state
// object it returns this app's view only when the per-app guard accepts it, so a
// stale or sibling-app entry (shared '__csfView' key, same origin) degrades to null
// (the default view) instead of being handed back in the wrong shape.

type Screen = { mode: 'workbench' | 'preview'; focus: { kind: string } };
function isScreen(raw: unknown): raw is Screen {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    ((raw as { mode?: unknown }).mode === 'workbench' || (raw as { mode?: unknown }).mode === 'preview')
  );
}

// The wrapper writes under this exact key (view-history.ts KEY).
const KEY = '__csfView';

describe('readView', () => {
  it('returns the stored view when the guard accepts it', () => {
    const view: Screen = { mode: 'workbench', focus: { kind: 'overview' } };
    expect(readView({ [KEY]: view }, isScreen)).toEqual(view);
  });

  it('returns null for a foreign shape the guard rejects', () => {
    // e.g. the Assessment app's StageView under the shared key.
    expect(readView({ [KEY]: { stage: 'empty' } }, isScreen)).toBeNull();
    expect(readView({ [KEY]: { stage: 'assessment', focus: null } }, isScreen)).toBeNull();
  });

  it('returns null when the key is absent', () => {
    expect(readView({ other: 1 }, isScreen)).toBeNull();
    expect(readView({}, isScreen)).toBeNull();
  });

  it('returns null for a non-object state', () => {
    for (const state of [null, undefined, 'x', 42]) {
      expect(readView(state, isScreen)).toBeNull();
    }
  });
});

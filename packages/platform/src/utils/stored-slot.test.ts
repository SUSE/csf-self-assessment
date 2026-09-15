import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { storedSlot } from './stored-slot';

const Schema = z.object({ kind: z.literal('demo'), n: z.number() });
const VALUE = { kind: 'demo', n: 2 } as const;

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storedSlot', () => {
  it('round-trips one validated record under its key', () => {
    const store = memoryStorage();
    vi.stubGlobal('localStorage', store);
    const slot = storedSlot('demo-key', Schema);

    slot.store(VALUE);
    expect(store.map.get('demo-key')).toBe(JSON.stringify(VALUE));
    expect(slot.load()).toEqual(VALUE);

    slot.clear();
    expect(slot.load()).toBeNull();
  });

  it('reads an empty slot as null', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(storedSlot('demo-key', Schema).load()).toBeNull();
  });

  it('reads unparsable and stale entries as null instead of throwing', () => {
    vi.stubGlobal(
      'localStorage',
      memoryStorage({ broken: 'not json', stale: JSON.stringify({ kind: 'demo' }) }),
    );
    expect(storedSlot('broken', Schema).load()).toBeNull();
    expect(storedSlot('stale', Schema).load()).toBeNull();
  });

  it('keeps two slots independent', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const a = storedSlot('a', Schema);
    const b = storedSlot('b', Schema);

    a.store(VALUE);
    expect(b.load()).toBeNull();
    b.clear();
    expect(a.load()).toEqual(VALUE);
  });

  it('degrades to in-memory when localStorage refuses (quota / private mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    vi.stubGlobal('localStorage', throwing);
    const slot = storedSlot('demo-key', Schema);

    expect(() => slot.store(VALUE)).not.toThrow();
    expect(() => slot.clear()).not.toThrow();
    expect(slot.load()).toBeNull();
  });
});

// One named localStorage slot holding one zod-validated record. The whole local
// persistence policy lives here — parse leniency is the caller's schema, writes
// and removes are best-effort, and a corrupt or stale entry reads as null rather
// than crashing the app ( — offline-safe, no network). Every store in
// the family (the Author draft, the participant state, the facilitator state) is
// one declaration against this module, so a policy change is a one-file edit.
import type { z } from 'zod';

export interface StoredSlot<T> {
  // The stored record, or null when there is none, it no longer parses (a schema
  // change since it was written), or localStorage is unavailable (private mode).
  load(): T | null;
  // Overwrite the slot. Best-effort: the in-memory value stays the source of truth.
  store(value: T): void;
  // Empty the slot. Best-effort, like store.
  clear(): void;
}

export function storedSlot<S extends z.ZodTypeAny>(
  key: string,
  schema: S,
): StoredSlot<z.output<S>> {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const parsed = schema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    store(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Best-effort — see this file's header.
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        // Best-effort — see this file's header.
      }
    },
  };
}

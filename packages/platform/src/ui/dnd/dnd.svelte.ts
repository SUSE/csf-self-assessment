import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

// A pointer-drag SESSION shared by the draggable chips and drop targets of ONE
// card. Deliberately DOM-free: the `draggable` /
// `dropTarget` actions own the pointer wiring and `elementFromPoint` hit-test and
// call INTO this state core, so the transitions (begin → track → drop / cancel)
// stay unit-testable in the repo's node-only test env. Provided via Svelte
// context so a card `createDnd()`s once and its chips/targets `getDnd()` it.

// The minimum a drag payload must carry so the floating ghost can render it; the
// card's richer Chip object satisfies it and rides through as the session's `P`.
export type DragPayload = { label: string; critical?: boolean };

type DropHandler<P extends DragPayload> = (payload: P) => void;

export class DndSession<P extends DragPayload = DragPayload> {
  // The chip being dragged: its stable `key` and payload, or null when idle.
  active = $state<{ key: string; payload: P } | null>(null);
  // The drop-target key currently under the pointer, or null.
  over = $state<string | null>(null);
  // Viewport coords of the pointer while dragging (drives the ghost), or null.
  pos = $state<{ x: number; y: number } | null>(null);

  // Drop targets register a handler keyed by their drop-key; separate namespace
  // from a chip's drag key.
  #targets = new SvelteMap<string, DropHandler<P>>();

  register(key: string, onDrop: DropHandler<P>): void {
    this.#targets.set(key, onDrop);
  }
  unregister(key: string): void {
    this.#targets.delete(key);
    if (this.over === key) this.over = null;
  }

  begin(key: string, payload: P, x: number, y: number): void {
    this.active = { key, payload };
    this.pos = { x, y };
    this.over = null;
  }
  // Track the pointer and the target beneath it as the drag moves.
  track(x: number, y: number, overKey: string | null): void {
    if (this.active === null) return;
    this.pos = { x, y };
    this.over = overKey;
  }
  // Drop the active payload on the current `over` target, then go idle.
  drop(): void {
    const target = this.over;
    const active = this.active;
    this.active = null;
    this.over = null;
    this.pos = null;
    if (target === null || active === null) return;
    this.#targets.get(target)?.(active.payload);
  }
  cancel(): void {
    this.active = null;
    this.over = null;
    this.pos = null;
  }

  get dragging(): boolean {
    return this.active !== null;
  }
}

const KEY = Symbol('csf-dnd');

export function createDnd<P extends DragPayload>(): DndSession<P> {
  const session = new DndSession<P>();
  setContext(KEY, session);
  return session;
}

// The card's session, or undefined when rendered outside a provider (e.g. the
//    single-unit ladder-card, which has no fan-out to drag).
export function getDnd<P extends DragPayload = DragPayload>(): DndSession<P> | undefined {
  return getContext<DndSession<P> | undefined>(KEY);
}

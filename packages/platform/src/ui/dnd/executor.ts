import type { DragPayload } from './dnd.svelte';
import type { GestureCommand, ScrollEdges } from './gesture-machine';

// The interpreter half of the chip drag: `gesture-machine` decides, this carries
// out. Every browser effect a press needs arrives through `ExecutorEnv` — the DOM
// reads too, not just the callbacks — so the whole pipeline (pointer → machine →
// command → effect) replays in a node test against a fake env. `draggable` builds
// the real DOM one; the test fake is the second implementation, which is what
// makes this a seam rather than a hypothetical one.

/** The slice of a drag session the interpreter drives; `DndSession` satisfies it. */
export type DragTarget<P extends DragPayload> = {
  begin(key: string, payload: P, x: number, y: number): void;
  track(x: number, y: number, overKey: string | null): void;
  drop(): void;
  cancel(): void;
};

export type ExecutorParams<P extends DragPayload> = {
  session: DragTarget<P> | undefined;
  key: string;
  payload: P;
};

/** The region auto-scroll drives while a chip heads for an off-screen rung. */
export type Scroller = {
  /** Its visible top/bottom in viewport coords — the machine turns that into a speed. */
  edges(): ScrollEdges;
  scrollBy(dy: number): void;
};

export type ExecutorEnv = {
  /** Which drop target sits under this point, if any. */
  dropKeyAt(x: number, y: number): string | null;
  /** Pick the region this press will auto-scroll (resolved once, at press time). */
  scroller(): Scroller;
  /** Show or clear the chip's dragged-away styling. */
  setDragging(on: boolean): void;
  // Both hand back their own canceller, so the interpreter never holds a
  // browser handle (a timeout id, a frame id) to clear later.
  timer(ms: number, fire: () => void): () => void;
  frame(fire: () => void): () => void;
  /** Swallow the synthetic click a finished drag leaves behind, so it cannot re-tap the chip. */
  swallowClick(): void;
};

export type ExecutorDeps<P extends DragPayload> = {
  env: ExecutorEnv;
  /** Read at command time, so a reactive payload stays current. */
  params: () => ExecutorParams<P>;
  listen: () => void;
  unlisten: () => void;
  onHold: () => void;
  onFrame: () => void;
};

export type Executor = {
  resolveScroller(): void;
  /** The visible slice of that region, for the machine's scroll ramp. */
  edges(): ScrollEdges;
  release(): void;
  run(command: GestureCommand): void;
};

// Carries out the machine's commands, and owns the only mutable state a press
// has: which region scrolls, the hold timer, the frame in flight.
export function createExecutor<P extends DragPayload>(deps: ExecutorDeps<P>): Executor {
  const env = deps.env;
  let scroller: Scroller | undefined;
  let cancelHold: (() => void) | undefined;
  let cancelFrame: (() => void) | undefined;

  function stopScroll(): void {
    cancelFrame?.();
    cancelFrame = undefined;
  }

  function release(): void {
    cancelHold?.();
    cancelHold = undefined;
    stopScroll();
    env.setDragging(false);
    deps.unlisten();
  }

  // The frame has fired, so the slot is free before the machine asks for the next one.
  function onFrame(): void {
    cancelFrame = undefined;
    deps.onFrame();
  }

  return {
    resolveScroller(): void {
      scroller = env.scroller();
    },

    edges(): ScrollEdges {
      return (scroller ??= env.scroller()).edges();
    },

    release,

    run(command: GestureCommand): void {
      const p = deps.params();
      if (!p.session) return;
      switch (command.kind) {
        case 'listen':
          return deps.listen();
        case 'release':
          return release();
        case 'holdTimer':
          cancelHold = env.timer(command.ms, deps.onHold);
          return;
        case 'beginDrag':
          env.setDragging(true);
          p.session.begin(p.key, p.payload, command.x, command.y);
          return;
        case 'track':
          return p.session.track(command.x, command.y, env.dropKeyAt(command.x, command.y));
        case 'autoScroll':
          if (command.velocity === 0) stopScroll();
          else cancelFrame ??= env.frame(onFrame);
          return;
        case 'scrollBy':
          return (scroller ??= env.scroller()).scrollBy(command.velocity);
        case 'drop':
          return p.session.drop();
        case 'cancelDrag':
          return p.session.cancel();
        case 'swallowClick':
          return env.swallowClick();
        case 'preventDefault':
          return; // only the caller still holding the DOM event can do this
      }
    },
  };
}

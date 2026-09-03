import type { ActionReturn } from 'svelte/action';
import type { DndSession, DragPayload } from './dnd.svelte';
import { createExecutor, type ExecutorEnv, type Scroller } from './executor';
import { IDLE, step, type GestureCommand, type GestureEvent, type GestureState } from './gesture-machine';

// The DOM half of the chip drag: `draggable` stamps pointer events into the pure
// `gesture-machine`, and the `executor` carries out the commands it returns
// against the environment built here. This file holds no decisions and no
// bookkeeping — only browser access.
//
// It works on POINTER events (mouse + touch + pen — spec: works on a
// facilitator's tablet). The node's touch-action is `pan-y`, so a vertical touch
// scrolls the page until the hold arms a drag. It listens on `window` while a
// press is live (no pointer-capture needed) and hit-tests drop targets with
// `elementFromPoint`, so the node can go pointer-events:none during the drag
// without blocking targets it overlaps. Near a scroll edge it scrolls the
// nearest scrollable ancestor (the tall ladder lives in the stage's scroll
// region) and re-runs the live hit-test as content slides under the pointer.

export type DraggableParams<P extends DragPayload> = {
  session: DndSession<P> | undefined;
  /** Stable key identifying this chip (also its data-chip-key in the card). */
  key: string;
  payload: P;
};

// The nearest ancestor that actually scrolls vertically, else the window.
function scrollParent(el: HTMLElement): HTMLElement | Window {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && n.scrollHeight > n.clientHeight) return n;
  }
  return window;
}

// Its visible slice, clamped to the viewport for a region taller than it.
function domScroller(el: HTMLElement): Scroller {
  const region = scrollParent(el);
  if (region instanceof Window) {
    return {
      edges: () => ({ top: 0, bottom: region.innerHeight }),
      scrollBy: (dy) => region.scrollBy(0, dy),
    };
  }
  return {
    edges: () => {
      const r = region.getBoundingClientRect();
      return { top: Math.max(0, r.top), bottom: Math.min(window.innerHeight, r.bottom) };
    },
    scrollBy: (dy) => {
      region.scrollTop += dy;
    },
  };
}

function domEnv(node: HTMLElement): ExecutorEnv {
  return {
    dropKeyAt(x, y) {
      const el = document.elementFromPoint(x, y);
      return el?.closest('[data-drop-key]')?.getAttribute('data-drop-key') ?? null;
    },

    scroller: () => domScroller(node),

    // The look lives in theme.css with the other global state rules; this only
    // stamps the state.
    setDragging(on) {
      if (on) node.dataset.dragging = '';
      else delete node.dataset.dragging;
    },

    timer(ms, fire) {
      const id = setTimeout(fire, ms);
      return () => clearTimeout(id);
    },

    frame(fire) {
      const id = requestAnimationFrame(fire);
      return () => cancelAnimationFrame(id);
    },

    // The browser fires a synthetic click after a drag; stop it re-triggering the
    // chip's tap (onSelect).
    swallowClick() {
      const swallow = (ev: Event): void => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      node.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => node.removeEventListener('click', swallow, { capture: true }), 0);
    },
  };
}

export function draggable<P extends DragPayload>(
  node: HTMLElement,
  params: DraggableParams<P>,
): ActionReturn<DraggableParams<P>> {
  let p = params;
  let state: GestureState = IDLE;

  const executor = createExecutor<P>({
    env: domEnv(node),
    params: () => p,
    listen,
    unlisten,
    onHold: () => send({ kind: 'holdElapsed' }),
    onFrame: () => send({ kind: 'scrollFrame' }),
  });

  // Returns the commands, so a caller still holding the DOM event can honour the
  // one only it can (preventDefault).
  function send(event: GestureEvent): GestureCommand[] {
    if (!p.session) return [];
    const next = step(state, event);
    state = next.state;
    for (const command of next.commands) executor.run(command);
    return next.commands;
  }

  function listen(): void {
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
  }
  function unlisten(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey);
  }

  function onDown(e: PointerEvent): void {
    if (!p.session || !p.key) return;
    if (e.target instanceof Element && e.target.closest('[data-no-drag]')) return; // the split ⋯
    executor.resolveScroller();
    send({ kind: 'down', pointerId: e.pointerId, pointerType: e.pointerType, button: e.button, x: e.clientX, y: e.clientY });
  }

  function onMove(e: PointerEvent): void {
    // Measure the scroll region only when a drag could be under way; a pending
    // touch is still just scrolling the page.
    const edges = state.phase === 'armed' || state.phase === 'dragging' ? executor.edges() : undefined;
    const commands = send({ kind: 'move', pointerId: e.pointerId, x: e.clientX, y: e.clientY, edges });
    // Suppress scroll / text-selection, but only where the machine called for it.
    if (commands.some((command) => command.kind === 'preventDefault')) e.preventDefault();
  }

  function onUp(e: PointerEvent): void {
    send({ kind: 'up', pointerId: e.pointerId });
  }
  function onCancel(): void {
    send({ kind: 'cancel' });
  }
  function onKey(e: KeyboardEvent): void {
    send({ kind: 'key', key: e.key });
  }

  node.style.touchAction = 'pan-y'; // let a vertical touch scroll the page; the hold arms a drag
  node.addEventListener('pointerdown', onDown);

  return {
    update(next: DraggableParams<P>): void {
      p = next;
    },
    destroy(): void {
      node.removeEventListener('pointerdown', onDown);
      state = IDLE;
      executor.release();
    },
  };
}

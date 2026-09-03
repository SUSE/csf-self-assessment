// The WHOLE chip-drag decision table, DOM-free: tap vs drag, the touch hold, the
// pre-arm scroll slop, Escape, and the edge auto-scroll ramp. Pointer facts and
// measured numbers go in, a new state and a list of commands come out — the same
// seam as the repo's pure-core clock rule, so every branch is reachable from a
// node-only test instead of a real browser. `draggable` is the adapter that stamps
// DOM events into `step` and executes what comes back; it holds no decisions.

const THRESHOLD = 6; // px of travel before a mouse/pen press becomes a drag
const TOUCH_HOLD = 200; // ms a touch must dwell before it arms a drag
const TOUCH_SLOP = 10; // px of pre-arm touch travel that reads as a scroll, not a drag
const EDGE = 72; // px from a scroll edge where auto-scroll engages
const SPEED = 18; // max px scrolled per frame at the very edge

export { EDGE, SPEED, THRESHOLD, TOUCH_HOLD, TOUCH_SLOP };

type Point = { x: number; y: number };

/** The visible top/bottom of the scroll region, in viewport coords — the adapter
 *  measures it, the machine decides what speed that means. */
export type ScrollEdges = { top: number; bottom: number };

/** `pending` is the touch waiting out its hold; `armed` is the mouse/pen press
 *  waiting to travel past the threshold. A touch never sits in `armed`: its hold
 *  begins the drag outright. */
export type GestureState =
  | { phase: 'idle' }
  | { phase: 'pending'; pointerId: number; start: Point }
  | { phase: 'armed'; pointerId: number; start: Point }
  | { phase: 'dragging'; pointerId: number; at: Point; scrollV: number };

export type GestureEvent =
  | { kind: 'down'; pointerId: number; pointerType: string; button: number; x: number; y: number }
  /** `edges` is present only once a drag can be in flight; absent means "do not auto-scroll". */
  | { kind: 'move'; pointerId: number; x: number; y: number; edges?: ScrollEdges | undefined }
  | { kind: 'holdElapsed' }
  | { kind: 'up'; pointerId: number }
  | { kind: 'cancel' }
  | { kind: 'key'; key: string }
  | { kind: 'scrollFrame' };

export type GestureCommand =
  /** Subscribe to window pointer/key events for the life of the press. */
  | { kind: 'listen' }
  /** Undo `listen`: drop the subscriptions, the hold timer, the scroll loop and the drag styling. */
  | { kind: 'release' }
  | { kind: 'holdTimer'; ms: number }
  | { kind: 'beginDrag'; x: number; y: number }
  | { kind: 'preventDefault' }
  /** Hit-test this point and report it to the session. */
  | { kind: 'track'; x: number; y: number }
  /** Run the scroll loop at this speed; 0 stops it. */
  | { kind: 'autoScroll'; velocity: number }
  | { kind: 'scrollBy'; velocity: number }
  | { kind: 'drop' }
  | { kind: 'cancelDrag' }
  /** Swallow the synthetic click a finished drag leaves behind, so it cannot re-tap the chip. */
  | { kind: 'swallowClick' };

export type GestureStep = { state: GestureState; commands: GestureCommand[] };

export const IDLE: GestureState = { phase: 'idle' };

/** How fast to scroll with the pointer at `y`: zero in the middle, ramping to
 *  ±SPEED at either edge of the region. */
export function scrollVelocity(y: number, edges: ScrollEdges): number {
  const dTop = y - edges.top;
  if (dTop < EDGE) return -SPEED * (1 - Math.max(0, dTop) / EDGE);
  const dBottom = edges.bottom - y;
  if (dBottom < EDGE) return SPEED * (1 - Math.max(0, dBottom) / EDGE);
  return 0;
}

function stay(state: GestureState): GestureStep {
  return { state, commands: [] };
}

function abort(state: GestureState): GestureStep {
  if (state.phase === 'idle') return stay(state);
  const commands: GestureCommand[] = state.phase === 'dragging' ? [{ kind: 'cancelDrag' }, { kind: 'release' }] : [{ kind: 'release' }];
  return { state: IDLE, commands };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Shared by the move that BEGINS a drag and every move after it, so the two
// cannot drift apart.
function dragMove(pointerId: number, at: Point, edges: ScrollEdges | undefined, begun: GestureCommand[]): GestureStep {
  const velocity = edges ? scrollVelocity(at.y, edges) : 0;
  return {
    state: { phase: 'dragging', pointerId, at, scrollV: velocity },
    commands: [...begun, { kind: 'preventDefault' }, { kind: 'track', x: at.x, y: at.y }, { kind: 'autoScroll', velocity }],
  };
}

export function step(state: GestureState, event: GestureEvent): GestureStep {
  switch (event.kind) {
    case 'down': {
      if (event.pointerType === 'mouse' && event.button !== 0) return stay(state); // left button only
      const start = { x: event.x, y: event.y };
      if (event.pointerType === 'touch') {
        return {
          state: { phase: 'pending', pointerId: event.pointerId, start },
          commands: [{ kind: 'holdTimer', ms: TOUCH_HOLD }, { kind: 'listen' }],
        };
      }
      return { state: { phase: 'armed', pointerId: event.pointerId, start }, commands: [{ kind: 'listen' }] };
    }

    case 'holdElapsed': {
      if (state.phase !== 'pending') return stay(state); // the hold lost its race with a move or a release
      return {
        state: { phase: 'dragging', pointerId: state.pointerId, at: state.start, scrollV: 0 },
        commands: [{ kind: 'beginDrag', x: state.start.x, y: state.start.y }],
      };
    }

    case 'move': {
      if (state.phase === 'idle' || event.pointerId !== state.pointerId) return stay(state);
      const at = { x: event.x, y: event.y };
      if (state.phase === 'pending') {
        // Pre-arm touch travel is the page being scrolled, not a grab.
        return distance(at, state.start) > TOUCH_SLOP ? abort(state) : stay(state);
      }
      if (state.phase === 'armed') {
        if (distance(at, state.start) < THRESHOLD) return stay(state); // still a tap
        return dragMove(state.pointerId, at, event.edges, [{ kind: 'beginDrag', x: at.x, y: at.y }]);
      }
      return dragMove(state.pointerId, at, event.edges, []);
    }

    case 'scrollFrame': {
      if (state.phase !== 'dragging' || state.scrollV === 0) return { state, commands: [{ kind: 'autoScroll', velocity: 0 }] };
      return {
        state,
        commands: [
          { kind: 'scrollBy', velocity: state.scrollV },
          // Content moved under a stationary pointer — re-run the live hit-test.
          { kind: 'track', x: state.at.x, y: state.at.y },
          { kind: 'autoScroll', velocity: state.scrollV },
        ],
      };
    }

    case 'up': {
      if (state.phase === 'idle' || event.pointerId !== state.pointerId) return stay(state);
      if (state.phase !== 'dragging') return { state: IDLE, commands: [{ kind: 'release' }] }; // a tap: let the click through
      return { state: IDLE, commands: [{ kind: 'drop' }, { kind: 'release' }, { kind: 'swallowClick' }] };
    }

    case 'cancel':
      return abort(state);

    case 'key':
      return event.key === 'Escape' && state.phase === 'dragging' ? abort(state) : stay(state);
  }
}

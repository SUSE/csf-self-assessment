import { describe, expect, it } from 'vitest';
import {
  EDGE,
  IDLE,
  SPEED,
  THRESHOLD,
  TOUCH_HOLD,
  TOUCH_SLOP,
  scrollVelocity,
  step,
  type GestureCommand,
  type GestureEvent,
  type GestureState,
  type ScrollEdges,
} from './gesture-machine';

const EDGES: ScrollEdges = { top: 0, bottom: 1000 };

// Middle of a 1000px region: far from either edge, so no auto-scroll noise.
const MID = 500;

function kinds(commands: GestureCommand[]): string[] {
  return commands.map((command) => command.kind);
}

function run(events: GestureEvent[], from: GestureState = IDLE): { state: GestureState; commands: GestureCommand[] } {
  let state = from;
  let commands: GestureCommand[] = [];
  for (const event of events) {
    const next = step(state, event);
    state = next.state;
    commands = next.commands;
  }
  return { state, commands };
}

function mouseDown(x = 100, y = MID): GestureEvent {
  return { kind: 'down', pointerId: 1, pointerType: 'mouse', button: 0, x, y };
}
function touchDown(x = 100, y = MID): GestureEvent {
  return { kind: 'down', pointerId: 1, pointerType: 'touch', button: 0, x, y };
}
function move(x: number, y: number, edges: ScrollEdges = EDGES): GestureEvent {
  return { kind: 'move', pointerId: 1, x, y, edges };
}

describe('press', () => {
  it('arms a mouse press at once and listens', () => {
    const { state, commands } = run([mouseDown()]);
    expect(state).toEqual({ phase: 'armed', pointerId: 1, start: { x: 100, y: MID } });
    expect(kinds(commands)).toEqual(['listen']);
  });

  it('holds a touch press pending, and asks for the hold timer', () => {
    const { state, commands } = run([touchDown()]);
    expect(state.phase).toBe('pending');
    expect(commands).toEqual([{ kind: 'holdTimer', ms: TOUCH_HOLD }, { kind: 'listen' }]);
  });

  it('arms a pen press like a mouse', () => {
    const { state } = run([{ kind: 'down', pointerId: 7, pointerType: 'pen', button: 0, x: 0, y: 0 }]);
    expect(state.phase).toBe('armed');
  });

  it('ignores a non-left mouse button', () => {
    const { state, commands } = run([{ kind: 'down', pointerId: 1, pointerType: 'mouse', button: 2, x: 0, y: 0 }]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([]);
  });

  it('does not read a non-left button on touch as a right-click', () => {
    // Some touch stacks report button -1; only `mouse` is filtered.
    const { state } = run([{ kind: 'down', pointerId: 1, pointerType: 'touch', button: -1, x: 0, y: 0 }]);
    expect(state.phase).toBe('pending');
  });
});

describe('tap vs drag', () => {
  it('keeps a mouse press a tap below the threshold', () => {
    const { state, commands } = run([mouseDown(100, MID), move(100 + THRESHOLD - 1, MID)]);
    expect(state.phase).toBe('armed');
    expect(commands).toEqual([]);
  });

  it('begins the drag once travel reaches the threshold', () => {
    const { state, commands } = run([mouseDown(100, MID), move(100 + THRESHOLD, MID)]);
    expect(state).toEqual({ phase: 'dragging', pointerId: 1, at: { x: 100 + THRESHOLD, y: MID }, scrollV: 0 });
    expect(commands).toEqual([
      { kind: 'beginDrag', x: 100 + THRESHOLD, y: MID },
      { kind: 'preventDefault' },
      { kind: 'track', x: 100 + THRESHOLD, y: MID },
      { kind: 'autoScroll', velocity: 0 },
    ]);
  });

  it('measures threshold travel diagonally, not per axis', () => {
    // 4px on each axis is under 6 per axis but 5.66 together — still a tap.
    expect(run([mouseDown(0, 0), move(4, 4)]).state.phase).toBe('armed');
    expect(run([mouseDown(0, 0), move(5, 5)]).state.phase).toBe('dragging');
  });

  it('releases a tap with no drop and no click swallowed', () => {
    const { state, commands } = run([mouseDown(), { kind: 'up', pointerId: 1 }]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'release' }]);
  });

  it('drops a finished drag, then swallows the synthetic click', () => {
    const { state, commands } = run([mouseDown(100, MID), move(200, MID), { kind: 'up', pointerId: 1 }]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'drop' }, { kind: 'release' }, { kind: 'swallowClick' }]);
  });
});

describe('touch hold and scroll slop', () => {
  it('begins the drag at the press point when the hold elapses', () => {
    const { state, commands } = run([touchDown(50, 300), { kind: 'holdElapsed' }]);
    expect(state).toEqual({ phase: 'dragging', pointerId: 1, at: { x: 50, y: 300 }, scrollV: 0 });
    expect(commands).toEqual([{ kind: 'beginDrag', x: 50, y: 300 }]);
  });

  it('lets a small pre-arm wobble keep waiting for the hold', () => {
    const { state, commands } = run([touchDown(0, 0), move(TOUCH_SLOP - 1, 0)]);
    expect(state.phase).toBe('pending');
    expect(commands).toEqual([]);
  });

  it('abandons the drag when pre-arm travel passes the slop — that is a page scroll', () => {
    const { state, commands } = run([touchDown(0, 0), move(TOUCH_SLOP + 1, 0)]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'release' }]);
  });

  it('never begins a drag on a touch that only travelled past the threshold', () => {
    // The mouse threshold (6) is well under the slop (10), so travel alone must not arm a touch.
    const { state, commands } = run([touchDown(0, 0), move(THRESHOLD + 1, 0)]);
    expect(state.phase).toBe('pending');
    expect(commands).toEqual([]);
  });

  it('ignores a hold that lost its race with the release', () => {
    const { state, commands } = run([touchDown(), { kind: 'up', pointerId: 1 }, { kind: 'holdElapsed' }]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([]);
  });

  it('ignores a hold that lost its race with a scroll', () => {
    const { state } = run([touchDown(0, 0), move(TOUCH_SLOP + 1, 0), { kind: 'holdElapsed' }]);
    expect(state).toEqual(IDLE);
  });

  it('tracks the pointer once the held drag is under way', () => {
    const { state, commands } = run([touchDown(50, 300), { kind: 'holdElapsed' }, move(60, 320)]);
    expect(state).toMatchObject({ phase: 'dragging', at: { x: 60, y: 320 } });
    expect(kinds(commands)).toEqual(['preventDefault', 'track', 'autoScroll']);
  });
});

describe('foreign pointers', () => {
  it('ignores a move from another pointer', () => {
    const armed = step(IDLE, mouseDown(0, 0)).state;
    const { state, commands } = step(armed, { kind: 'move', pointerId: 2, x: 500, y: 500, edges: EDGES });
    expect(state).toBe(armed);
    expect(commands).toEqual([]);
  });

  it('ignores a release from another pointer mid-drag', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID)]).state;
    const { state, commands } = step(dragging, { kind: 'up', pointerId: 2 });
    expect(state).toBe(dragging);
    expect(commands).toEqual([]);
  });

  it('ignores every event while idle', () => {
    for (const event of [move(10, 10), { kind: 'up', pointerId: 1 } as const, { kind: 'scrollFrame' } as const]) {
      expect(step(IDLE, event).state).toEqual(IDLE);
    }
    expect(step(IDLE, { kind: 'scrollFrame' }).commands).toEqual([{ kind: 'autoScroll', velocity: 0 }]);
  });
});

describe('abandoning a press', () => {
  it('cancels a drag in flight on pointercancel', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID)]).state;
    const { state, commands } = step(dragging, { kind: 'cancel' });
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'cancelDrag' }, { kind: 'release' }]);
  });

  it('just lets go when the cancelled press never became a drag', () => {
    const { state, commands } = run([mouseDown(), { kind: 'cancel' }]);
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'release' }]);
  });

  it('cancels a drag in flight on Escape', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID)]).state;
    const { state, commands } = step(dragging, { kind: 'key', key: 'Escape' });
    expect(state).toEqual(IDLE);
    expect(commands).toEqual([{ kind: 'cancelDrag' }, { kind: 'release' }]);
  });

  it('leaves a press that is not yet a drag alone on Escape', () => {
    const armed = step(IDLE, mouseDown()).state;
    const { state, commands } = step(armed, { kind: 'key', key: 'Escape' });
    expect(state).toBe(armed);
    expect(commands).toEqual([]);
  });

  it('ignores any other key', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID)]).state;
    expect(step(dragging, { kind: 'key', key: 'Enter' }).state).toBe(dragging);
  });
});

describe('edge auto-scroll speed', () => {
  it('is zero away from both edges', () => {
    expect(scrollVelocity(MID, EDGES)).toBe(0);
    expect(scrollVelocity(EDGE, EDGES)).toBe(0);
    expect(scrollVelocity(1000 - EDGE, EDGES)).toBe(0);
  });

  it('ramps up to full speed at the top edge', () => {
    expect(scrollVelocity(EDGE - 1, EDGES)).toBeCloseTo(-SPEED / EDGE);
    expect(scrollVelocity(EDGE / 2, EDGES)).toBeCloseTo(-SPEED / 2);
    expect(scrollVelocity(0, EDGES)).toBe(-SPEED);
  });

  it('ramps up to full speed at the bottom edge', () => {
    expect(scrollVelocity(1000 - EDGE / 2, EDGES)).toBeCloseTo(SPEED / 2);
    expect(scrollVelocity(1000, EDGES)).toBe(SPEED);
  });

  it('clamps past either edge instead of overshooting', () => {
    expect(scrollVelocity(-500, EDGES)).toBe(-SPEED);
    expect(scrollVelocity(1500, EDGES)).toBe(SPEED);
  });

  it('measures from the region, not the viewport', () => {
    // A panel starting 400px down: 420 is near ITS top edge, not the window's middle.
    expect(scrollVelocity(420, { top: 400, bottom: 900 })).toBeLessThan(0);
    expect(scrollVelocity(420, EDGES)).toBe(0);
  });

  it('prefers the top edge in a region shorter than two edge zones', () => {
    expect(scrollVelocity(50, { top: 0, bottom: 100 })).toBeLessThan(0);
  });
});

describe('auto-scroll while dragging', () => {
  it('starts the scroll loop when a drag move reaches the edge', () => {
    const { state, commands } = run([mouseDown(0, MID), move(100, MID), move(100, 10)]);
    const velocity = scrollVelocity(10, EDGES);
    expect(state).toEqual({ phase: 'dragging', pointerId: 1, at: { x: 100, y: 10 }, scrollV: velocity });
    expect(commands).toContainEqual({ kind: 'autoScroll', velocity });
  });

  it('stops the scroll loop when the pointer comes back off the edge', () => {
    const { state, commands } = run([mouseDown(0, MID), move(100, MID), move(100, 10), move(100, MID)]);
    expect(state).toMatchObject({ scrollV: 0 });
    expect(commands).toContainEqual({ kind: 'autoScroll', velocity: 0 });
  });

  it('never scrolls when the adapter measured no region', () => {
    const { state, commands } = run([mouseDown(0, 0), { kind: 'move', pointerId: 1, x: 100, y: 0 }]);
    expect(state).toMatchObject({ scrollV: 0 });
    expect(commands).toContainEqual({ kind: 'autoScroll', velocity: 0 });
  });

  it('scrolls, re-hit-tests the held point, and asks for the next frame', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID), move(100, 10)]).state;
    const velocity = scrollVelocity(10, EDGES);
    const { state, commands } = step(dragging, { kind: 'scrollFrame' });
    expect(state).toBe(dragging); // the pointer has not moved; only the content has
    expect(commands).toEqual([
      { kind: 'scrollBy', velocity },
      { kind: 'track', x: 100, y: 10 },
      { kind: 'autoScroll', velocity },
    ]);
  });

  it('stops a stray frame that arrives with no speed set', () => {
    const dragging = run([mouseDown(0, MID), move(100, MID)]).state;
    expect(step(dragging, { kind: 'scrollFrame' }).commands).toEqual([{ kind: 'autoScroll', velocity: 0 }]);
  });

  it('stops a frame that arrives after the drop', () => {
    const { commands } = run([mouseDown(0, MID), move(100, 10), { kind: 'up', pointerId: 1 }, { kind: 'scrollFrame' }]);
    expect(commands).toEqual([{ kind: 'autoScroll', velocity: 0 }]);
  });
});

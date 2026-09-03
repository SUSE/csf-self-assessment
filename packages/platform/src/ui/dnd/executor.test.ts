import { describe, expect, it } from 'vitest';
import { createExecutor, type DragTarget, type ExecutorEnv, type ExecutorParams, type Scroller } from './executor';
import { IDLE, SPEED, THRESHOLD, TOUCH_HOLD, TOUCH_SLOP, step, type GestureEvent, type GestureState, type ScrollEdges } from './gesture-machine';

// The interpreter under a FAKE env: the same pointer → machine → command → effect
// pipeline the browser runs, replayed here as a script. `drive()` is the node-only
// twin of `draggable` — it stamps events into `step` and runs what comes back.

type Payload = { label: string };

const REGION: ScrollEdges = { top: 0, bottom: 1000 };
const MID = 500; // far from either edge: no auto-scroll noise
const CHIP: Payload = { label: 'chip' };

function drive(over: string | null = null) {
  const log: string[] = [];
  let dropKey = over;
  let holdFire: (() => void) | undefined;
  let frameFire: (() => void) | undefined;

  const session: DragTarget<Payload> = {
    begin: (key, payload, x, y) => log.push(`begin:${key}/${payload.label}@${x},${y}`),
    track: (x, y, overKey) => log.push(`track:${x},${y}->${overKey}`),
    drop: () => log.push('drop'),
    cancel: () => log.push('cancel'),
  };
  const params: ExecutorParams<Payload> = { session, key: 'c1', payload: CHIP };

  const scroller: Scroller = {
    edges: () => REGION,
    scrollBy: (dy) => log.push(`scrollBy:${Math.round(dy)}`),
  };
  const env: ExecutorEnv = {
    dropKeyAt: (x, y) => {
      log.push(`hitTest:${x},${y}`);
      return dropKey;
    },
    scroller: () => scroller,
    setDragging: (on) => log.push(`dragging:${on}`),
    timer: (ms, fire) => {
      log.push(`timer:${ms}`);
      holdFire = fire;
      return () => {
        holdFire = undefined;
        log.push('timer:off');
      };
    },
    frame: (fire) => {
      log.push('frame:on');
      frameFire = fire;
      return () => {
        frameFire = undefined;
        log.push('frame:off');
      };
    },
    swallowClick: () => log.push('swallowClick'),
  };

  let state: GestureState = IDLE;
  const executor = createExecutor<Payload>({
    env,
    params: () => params,
    listen: () => log.push('listen'),
    unlisten: () => log.push('unlisten'),
    onHold: () => send({ kind: 'holdElapsed' }),
    onFrame: () => send({ kind: 'scrollFrame' }),
  });

  function send(event: GestureEvent): void {
    if (!params.session) return;
    const next = step(state, event);
    state = next.state;
    for (const command of next.commands) executor.run(command);
  }

  return {
    params,
    executor,
    phase: () => state.phase,
    // The effects since the last read, then clear.
    take: (): string[] => log.splice(0, log.length),
    // What the next hit-test will report.
    hover: (key: string | null): void => {
      dropKey = key;
    },
    down: (type: 'mouse' | 'touch', x = 100, y = MID): void => {
      executor.resolveScroller();
      log.length = 0; // the scroller pick is setup, not an effect under test
      send({ kind: 'down', pointerId: 1, pointerType: type, button: 0, x, y });
    },
    move: (x: number, y: number): void => {
      // Mirrors `draggable`: measure the region only when a drag can be in flight.
      const edges = state.phase === 'armed' || state.phase === 'dragging' ? executor.edges() : undefined;
      send({ kind: 'move', pointerId: 1, x, y, edges });
    },
    up: (): void => send({ kind: 'up', pointerId: 1 }),
    cancel: (): void => send({ kind: 'cancel' }),
    escape: (): void => send({ kind: 'key', key: 'Escape' }),
    // Both return false when there was nothing armed to fire — an assertion in
    // its own right (the timer was cancelled, the loop was stopped).
    fireHold: (): boolean => {
      const armed = holdFire;
      armed?.();
      return armed !== undefined;
    },
    fireFrame: (): boolean => {
      const pending = frameFire;
      frameFire = undefined;
      pending?.();
      return pending !== undefined;
    },
  };
}

describe('mouse drag', () => {
  it('runs the whole press: begin, track, drop, release', () => {
    const d = drive('rung-3');
    d.down('mouse');
    expect(d.take()).toEqual(['listen']);

    d.move(100 + THRESHOLD + 1, MID);
    expect(d.take()).toEqual(['dragging:true', `begin:c1/chip@${100 + THRESHOLD + 1},${MID}`, `hitTest:${100 + THRESHOLD + 1},${MID}`, `track:${100 + THRESHOLD + 1},${MID}->rung-3`]);

    d.up();
    expect(d.take()).toEqual(['drop', 'dragging:false', 'unlisten', 'swallowClick']);
  });

  it('leaves a tap alone: no drag styling, no drop, and the click survives', () => {
    const d = drive();
    d.down('mouse');
    d.take();
    d.move(102, MID); // under the threshold
    d.up();
    expect(d.take()).toEqual(['dragging:false', 'unlisten']);
  });

  it('reports the target under the pointer at each step, not the one it started on', () => {
    const d = drive('rung-1');
    d.down('mouse');
    d.move(200, MID);
    d.take();
    d.hover('rung-4');
    d.move(210, MID);
    expect(d.take()).toEqual(['hitTest:210,500', 'track:210,500->rung-4']);
  });

  it('reads the payload at command time, so a re-rendered chip drags its new one', () => {
    const d = drive();
    d.down('mouse');
    d.params.payload = { label: 'renamed' };
    d.params.key = 'c2';
    d.take();
    d.move(200, MID);
    expect(d.take()[1]).toBe('begin:c2/renamed@200,500');
  });
});

describe('touch hold', () => {
  it('arms a hold timer and begins the drag when it elapses', () => {
    const d = drive('rung-2');
    d.down('touch');
    expect(d.take()).toEqual([`timer:${TOUCH_HOLD}`, 'listen']);

    expect(d.fireHold()).toBe(true);
    expect(d.take()).toEqual(['dragging:true', 'begin:c1/chip@100,500']);
    expect(d.phase()).toBe('dragging');
  });

  it('cancels the timer and never begins when the touch scrolls away first', () => {
    const d = drive();
    d.down('touch');
    d.take();
    d.move(100, MID + TOUCH_SLOP + 1);
    expect(d.take()).toEqual(['timer:off', 'dragging:false', 'unlisten']);
    expect(d.fireHold()).toBe(false);
  });
});

describe('auto-scroll', () => {
  it('asks for one frame at a time and re-hit-tests as content slides', () => {
    const d = drive('rung-9');
    d.down('mouse');
    d.move(100, 1000); // inside the bottom edge band
    expect(d.take()).toEqual(['listen', 'dragging:true', 'begin:c1/chip@100,1000', 'hitTest:100,1000', 'track:100,1000->rung-9', 'frame:on']);

    d.hover('rung-8');
    expect(d.fireFrame()).toBe(true);
    expect(d.take()).toEqual([`scrollBy:${SPEED}`, 'hitTest:100,1000', 'track:100,1000->rung-8', 'frame:on']);
  });

  it('does not stack frames while one is already in flight', () => {
    const d = drive();
    d.down('mouse');
    d.move(100, 995);
    d.take();
    d.move(101, 995); // still in the band, frame still pending
    expect(d.take()).not.toContain('frame:on');
  });

  it('stops the loop when the pointer leaves the edge band', () => {
    const d = drive();
    d.down('mouse');
    d.move(100, 995);
    d.take();
    d.move(100, MID);
    expect(d.take()).toContain('frame:off');
    expect(d.fireFrame()).toBe(false);
  });
});

describe('abandoning a drag', () => {
  it('cancels the session on Escape', () => {
    const d = drive('rung-1');
    d.down('mouse');
    d.move(200, MID);
    d.take();
    d.escape();
    expect(d.take()).toEqual(['cancel', 'dragging:false', 'unlisten']);
  });

  it('cancels on pointercancel and drops the pending frame with it', () => {
    const d = drive();
    d.down('mouse');
    d.move(100, 995);
    d.take();
    d.cancel();
    expect(d.take()).toEqual(['cancel', 'frame:off', 'dragging:false', 'unlisten']);
  });

  it('releases everything when the action is destroyed mid-drag', () => {
    const d = drive();
    d.down('touch');
    d.take();
    d.executor.release();
    expect(d.take()).toEqual(['timer:off', 'dragging:false', 'unlisten']);
  });
});

describe('no session', () => {
  it('runs no effects at all when the chip is outside a provider', () => {
    const d = drive();
    d.params.session = undefined;
    d.down('mouse');
    d.move(200, MID);
    d.up();
    expect(d.take()).toEqual([]);
  });
});

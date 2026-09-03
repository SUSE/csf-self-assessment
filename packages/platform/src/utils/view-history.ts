// In-session Back/Forward for the file-driven apps. Neither app has URL routes:
// a "screen" is in-memory `$state` (Author's mode, the Participant's stage) over
// data loaded from local files. Those files can't be re-fetched from a URL, so
// this gives BROWSER BACK within an open session — it steps through the views
// you visited — NOT reload-safe deep links (a refresh still lands on the empty
// state). The view descriptor is opaque and lives in history.state; the URL is
// never touched (design decision: a shareable-looking URL that can't restore
// would mislead).
//
// Usage: create one router with an `apply` that reconstructs state from a view,
// then drive `reflect` from a Svelte `$effect` that reads the derived view. The
// effect re-runs on every view change; reflect pushes a Back step and is a
// no-op when nothing changed. Data-load actions call `baseline` imperatively
// (see below) to REPLACE rather than push.

export interface ViewHistory<V> {
  // Effect-driven: record the current view, pushing a Back step when it changed
  // from the last recorded view. A no-op when unchanged, so it's safe to call
  // every effect run. The very first call replaces the page's own entry (so
  // backing to it restores the initial view) rather than pushing.
  reflect(view: V): void;
  // Imperative: replace the current history entry with `view` instead of
  // pushing. Data-load actions call this synchronously right after resetting
  // state, so Back can't return to a view that referenced now-unloaded data (a
  // superseded workbook/session). Called before the driving effect next runs,
  // it makes that run a no-op (the view already matches).
  baseline(view: V): void;
  // Drop the popstate listener (component teardown).
  destroy(): void;
}

const KEY = '__csfView';

// Read a view out of a raw history-state object and VALIDATE it before trusting
// it. The two apps persist different view shapes under the shared KEY (and an
// origin can carry an entry written by a sibling app or an older build — see
// persistedView), so a blind cast can hand a caller the wrong shape and crash it.
// `isValid` (a per-app type guard) rejects anything that isn't this app's view,
// mirroring the validate-on-load contract of the data stores (workbook-storage,
// participant-storage): a mismatch degrades to null, i.e. the default view. Pure
// (takes the state object, touches no globals) so it's unit-testable without a DOM.
export function readView<V>(state: unknown, isValid: (raw: unknown) => raw is V): V | null {
  if (state === null || typeof state !== 'object') return null;
  const raw = (state as Record<string, unknown>)[KEY];
  return raw !== undefined && isValid(raw) ? raw : null;
}

// The view persisted in the CURRENT history entry, or null. `history.state`
// survives a hard reload (the browser preserves the current entry's state), so
// an app that can also restore its DATA on reload (e.g. from local storage) can
// call this on mount to restore the last VIEW too — landing you back where you
// were, not on the default screen. Returns null on a fresh navigation (no state),
// after the app's own first reflect/baseline has yet to run, or when the stored
// view fails `isValid` (a stale or sibling-app entry — see readView).
export function persistedView<V>(isValid: (raw: unknown) => raw is V): V | null {
  return readView(history.state, isValid);
}

// `apply` sets app state to match a popped view; `equal` compares two views so a
// popstate-driven state change isn't mistaken for a fresh navigation and re-pushed;
// `isValid` (a per-app type guard) rejects a foreign/stale entry on the Back stack
// so it's ignored rather than applied (see readView).
export function createViewHistory<V>(
  apply: (view: V) => void,
  equal: (a: V, b: V) => boolean,
  isValid: (raw: unknown) => raw is V,
): ViewHistory<V> {
  // The view currently at the top of history. Undefined until the first reflect
  // or baseline establishes the app's own entry.
  let last: V | undefined;

  const write = (view: V, replace: boolean): void => {
    const entry = { [KEY]: view };
    if (replace) history.replaceState(entry, '');
    else history.pushState(entry, '');
    last = view;
  };

  const onPop = (event: PopStateEvent): void => {
    // Ignore an entry from before the app OR one written in another app's shape
    // (shared KEY, same origin) — validated, not blindly cast.
    const view = readView(event.state, isValid);
    if (view === null) return;
    // Adopt it as `last` BEFORE applying, so the state mutation apply() triggers
    // re-runs the driving effect but finds the view unchanged — no echo push.
    last = view;
    apply(view);
  };
  window.addEventListener('popstate', onPop);

  return {
    reflect(view: V): void {
      if (last !== undefined && equal(view, last)) return;
      write(view, last === undefined); // first call replaces; later ones push
    },
    baseline(view: V): void {
      write(view, true);
    },
    destroy(): void {
      window.removeEventListener('popstate', onPop);
    },
  };
}

// One card-level keystroke, mapped from KeyboardEvent.key (spec §4.10). `place`
// carries a 1-based authored rung POSITION, not a SEAL value (ADR-0023): a SEAL
// digit is ambiguous on any ladder that repeats a SEAL. The card resolves
// position → rung through `rungAtPosition`, so a digit past the end of the
// ladder is a no-op (never nearest-match). Space is NOT
// mapped (native button activation selects a rung / lifts a chip); arrows are the
// ladder's own (this returns null for them).
export type CardKey =
  | { kind: 'dont-know' }
  | { kind: 'na' }
  | { kind: 'next' }
  | { kind: 'place'; position: number };

// 'u'/'U' → dont-know; 'n'/'N' → na; 'Enter' → next; /^[1-9]$/ → place(position);
// everything else (incl. '0', ' ', 'ArrowUp'/'ArrowDown', 'Escape') → null.
export function cardKeyFor(key: string): CardKey | null {
  switch (key) {
    case 'u':
    case 'U':
      return { kind: 'dont-know' };
    case 'n':
    case 'N':
      return { kind: 'na' };
    case 'Enter':
      return { kind: 'next' };
  }
  if (/^[1-9]$/.test(key)) return { kind: 'place', position: Number(key) };
  return null;
}

// What each card supplies; `place(position)` is where the card resolves position
// → rung and no-ops past the end of the ladder.
export type CardKeyActions = {
  place: (position: number) => void;
  dontKnow: () => void;
  na: () => void;
  next: () => void;
};

// The shared svelte:window handler. Guards: focus must be inside the card; skip
// when a text field is focused (§4.10 suppresses letter/number keys there); skip
// modifier chords; skip if the ladder radiogroup already handled the key
// (e.defaultPrevented — arrows/digits when focus is in the ladder). Enter on a
// focused tray chip lifts it (native) and must NOT be hijacked to Next.
export function handleCardKeydown(
  e: KeyboardEvent,
  // `null` as well as `undefined`: a `bind:ref` on a Panel starts at null, and
  // the guard below already treats "no card yet" as "not ours to handle".
  cardEl: HTMLElement | null | undefined,
  actions: CardKeyActions,
): void {
  if (!cardEl || !cardEl.contains(document.activeElement)) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  const action = cardKeyFor(e.key);
  if (action === null) return;
  const el = document.activeElement;
  // Enter on a focused tray chip lifts it (native <button>); only hijack Enter →
  // Next when focus is elsewhere in the card (spec §4.10 resolved: Space activates
  // the focused control, Enter advances).
  if (action.kind === 'next' && el instanceof Element && el.closest('[data-tray-chip]') !== null) return;
  e.preventDefault();
  switch (action.kind) {
    case 'place': actions.place(action.position); break;
    case 'dont-know': actions.dontKnow(); break;
    case 'na': actions.na(); break;
    case 'next': actions.next(); break;
  }
}

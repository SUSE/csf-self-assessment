import { getContext, setContext } from 'svelte';
import { sameSelection, type InspectSelection } from './subject';

// The inspection SESSION — the one piece of state the right rail shares, held in
// context rather than threaded as props (twin of ui/rulebook's HelpSession).

// Context, not props, because the two ends are nowhere near each other: what gets
// selected is a wheel spoke five components inside the stage or a row inside a
// read-only workbook view, and what shows it is the app shell's right panel —
// outside the stage entirely. Threading `onInspect` / `onInspectQuestion` down
// every level between them is what this replaces, and each of those levels only
// forwarded the prop.

// An app with no rail calls nothing, `getInspector` returns null, and every
// consumer degrades to its plain behaviour — a spoke that only navigates, a row
// that only opens its editor. Same vocabulary as an omitted handler.
const INSPECTOR_KEY = Symbol('csf-inspector');

export class InspectorSession {
  // What is selected on the current page; null = nothing picked, so the rail
  // falls back to whatever the screen declares (see inspector-panel).
  selection = $state<InspectSelection | null>(null);

  // Whether the rail is open. It lives HERE, not in each shell, because "selecting
  // something reveals it" has to be a guarantee of the mechanism: a press that
  // silently fills a collapsed panel reads as a dead control. An app binds this to
  // `AppShell`'s `rightOpen`, so the in-panel chevron still owns it the rest of the
  // time.
  open = $state(true);

  // An inspector-aware component reports what it selected. Replacing is the same
  // call as selecting — a second spoke swaps the rail's subject, it never stacks —
  // and either way the rail comes open to show it.
  show(selection: InspectSelection): void {
    this.selection = selection;
    this.open = true;
  }

  // Drops the selection WITHOUT closing the rail: collapsing a panel the reader
  // did not collapse is the surprise this is avoiding, and the page's own subject
  // (or its hint) is what shows next.
  clear(): void {
    this.selection = null;
  }

  // Is this exactly what the rail shows? Drives a control's pressed state, so a
  // component never has to keep its own copy of the selection to look selected.
  isShowing(selection: InspectSelection): boolean {
    return sameSelection(this.selection, selection);
  }
}

export function createInspector(): InspectorSession {
  const session = new InspectorSession();
  setContext(INSPECTOR_KEY, session);
  return session;
}

export function getInspector(): InspectorSession | null {
  return getContext<InspectorSession | undefined>(INSPECTOR_KEY) ?? null;
}

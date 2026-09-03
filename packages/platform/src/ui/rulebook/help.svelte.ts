import { getContext, setContext } from 'svelte';
import type { RuleSection } from './content';

// The help SESSION — the one piece of state the whole help system shares, held in
// context rather than threaded as props.
//
// Context, not props, because the three participants in help mode are nowhere
// near each other in the tree: the toggle and the gated icons live in a stage
// header (inside the stage), the floating panel is an overlay on the app shell
// (outside the stage, so `position` and the carousel's transforms can't clip it),
// and a `RuleCite` sits five components deep inside an overview panel. Threading
// `onRule`/`ruleActive`/`onCite` down all three chains is what the previous
// version did, and it cost every intermediate component a prop it only forwarded.
//
// An app with no help calls nothing, `getHelp()` returns null, and every consumer
// degrades to its plain behaviour — the toggle renders nothing, a cite renders
// nothing, a header icon never gates. Same vocabulary as an omitted handler.
const HELP_KEY = Symbol('csf-help');

export class HelpSession {
  readonly #sections: () => RuleSection[];

  /** Help mode is on: the floating Rulebook shows and the stage header is gated. */
  open = $state(false);

  /** The card promoted to the top of the panel; null reads in authored order. */
  active = $state<string | null>(null);

  constructor(sections: () => RuleSection[]) {
    this.#sections = sections;
  }

  /** A thunk, not an array, because one app serves two readers: the assessment
   *  app hands the participant set or the facilitator set depending on which
   *  persona is loaded, and that changes under us. */
  get sections(): RuleSection[] {
    return this.#sections();
  }

  /** Does this reader's set hold a card for that id? This is the whole gating
   *  rule — a control whose id has no card has nothing to say, so it greys out
   *  in help mode, and a set can grow one card at a time with no wiring change. */
  has(id: string | null | undefined): boolean {
    return id !== null && id !== undefined && this.sections.some((s) => s.id === id);
  }

  /** The stage-header toggle. Leaving help mode forgets the promoted card, so
   *  the next entry starts in reading order rather than mid-thought — that is
   *  what "pressing it again resets" means. */
  toggle(): void {
    this.open = !this.open;
    if (!this.open) this.active = null;
  }

  close(): void {
    this.open = false;
    this.active = null;
  }

  /** A control under the cursor reports the rule that governs it. Promotes ONLY
   *  while help mode is on: a hover must never conjure the panel. */
  follow(id: string): void {
    if (this.open && this.has(id)) this.active = id;
  }

  /** A finding's citation, or a gated header icon. Unlike `follow`, this SHOWS
   *  the panel — it is a deliberate press, not a passing cursor. */
  cite(id: string): void {
    if (!this.has(id)) return;
    this.open = true;
    this.active = id;
  }
}

export function createHelp(sections: () => RuleSection[]): HelpSession {
  const session = new HelpSession(sections);
  setContext(HELP_KEY, session);
  return session;
}

export function getHelp(): HelpSession | null {
  return getContext<HelpSession | undefined>(HELP_KEY) ?? null;
}

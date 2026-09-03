// The shell half of the app's one Load control: file IO, the confirm gate, and
// applying an outcome. What the artifact MEANS in this mode is the pure `decideLoad`
// (@csf/platform/load). This is the only place a persona is entered, so the
// invariant stays readable — every case clears the other side first, and `Fill` and
// `Facilitator` are never both loaded. Reset is the only way to cross (delivery §4).
import { decideLoad } from '@csf/platform';
import type { ConfirmCopy, LoadMode, LoadOutcome } from '@csf/platform';
import { openJsonFile } from '@csf/platform/file-io';
import { nowInstant } from './clock';
import type { Facilitator } from './facilitator/facilitator.svelte';
import type { Fill } from './fill/fill.svelte';

/** The copy comes from the load decision; the work is the closure it captured. */
export type ConfirmGate = ConfirmCopy & { run: () => void };

type Deps = {
  fill: Fill;
  facilitator: Facilitator;
  /** Called once state has moved. A load is a BASELINE, not a Back step: it
   *  replaces the current history entry so Back can't return to a view that
   *  referenced the artifact just discarded. */
  onApplied: () => void;
};

export class Load {
  error = $state<string | null>(null);
  gate = $state<ConfirmGate | null>(null);

  readonly #deps: Deps;

  /** The first load from `empty` sets the mode; after that Load stays within it. A
   *  getter, not a `$derived` field: a field initializer runs before the constructor
   *  assigns `#deps` (and two boolean reads are nothing to memoise). */
  get mode(): LoadMode {
    return this.#deps.facilitator.active ? 'facilitator' : this.#deps.fill.loaded ? 'fill' : 'empty';
  }

  constructor(deps: Deps) {
    this.#deps = deps;
  }

  /** Open a file, route it, then refuse / confirm / apply. */
  async open(): Promise<void> {
    const opened = await openJsonFile();
    if (!opened) return;
    let data: unknown;
    try {
      data = JSON.parse(opened.text);
    } catch {
      this.error = `“${opened.name}” is not valid JSON.`;
      return;
    }
    const { facilitator } = this.#deps;
    const outcome = decideLoad({
      data,
      name: opened.name,
      mode: this.mode,
      merge: {
        active: facilitator.merge.workbookAssessment !== null,
        wa: facilitator.merge.workbookAssessment,
        incoming: facilitator.merge.incoming,
      },
      now: nowInstant(),
    });
    if (outcome.kind === 'error') {
      this.error = outcome.message;
      return;
    }
    if (outcome.confirm) {
      this.gate = { ...outcome.confirm, run: () => this.#apply(outcome) };
    } else {
      this.#apply(outcome);
    }
  }

  confirm(): void {
    const run = this.gate?.run;
    this.gate = null;
    run?.();
  }

  dismiss(): void {
    this.gate = null;
  }

  #apply(outcome: Exclude<LoadOutcome, { kind: 'error' }>): void {
    const { fill, facilitator } = this.#deps;
    this.error = null;
    switch (outcome.kind) {
      case 'fill-workbook-assessment':
        facilitator.clear();
        fill.enterFromWorkbookAssessment(outcome.wa);
        break;
      case 'fill-assessment':
        facilitator.clear();
        fill.enterFromAssessment(outcome.assessment);
        break;
      case 'facilitator-workbook':
        fill.clear();
        facilitator.enter(outcome.workbook);
        break;
      case 'facilitator-finalized':
        fill.clear();
        facilitator.enterFinalized(outcome.assessment);
        break;
      // The merge cases feed the merge rather than entering anything, so neither
      // side is cleared.
      case 'merge-start':
        facilitator.merge.start(outcome.wa, outcome.incoming);
        facilitator.section = 'merge';
        break;
      case 'merge-review':
        facilitator.merge.receive(outcome.partial);
        facilitator.section = 'merge';
        break;
    }
    this.#deps.onApplied();
  }
}

export function createLoad(deps: Deps): Load {
  return new Load(deps);
}

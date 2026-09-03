// Browser Back/Forward: the live state read OUT as a StageView, a popped one
// written back IN. The codec is the pure `stage-view.ts`; this is the half that
// touches the personas. It also owns the two navigations that must REPLACE before
// they push, since both are statements about what the entry Back returns to.
import { onDestroy } from 'svelte';
import { NO_HISTORY_VIEW } from '@csf/platform';
import type { Target } from '@csf/platform';
import { createViewHistory } from '@csf/platform/view-history';
import type { InspectorSession } from '@csf/platform/ui/inspector';
import type { Facilitator } from './facilitator/facilitator.svelte';
import type { Fill } from './fill/fill.svelte';
import { facilitatorScreenKey, isStageView, sameStageView, type StageView } from './stage-view';

type Deps = {
  fill: Fill;
  facilitator: Facilitator;
  inspector: InspectorSession;
};

export class StageRouter {
  readonly #deps: Deps;
  readonly #history: ReturnType<typeof createViewHistory<StageView>>;
  #lastScreen: string | null = null;

  /** Snapshotted, not the raw proxy: history.state is structured-cloned, and a
   *  `$state` proxy throws DataCloneError there. */
  get view(): StageView {
    const { fill, facilitator, inspector } = this.#deps;
    if (facilitator.active) {
      return {
        stage: 'facilitator',
        section: facilitator.section,
        selection: $state.snapshot(inspector.selection),
        history: facilitator.merge.historySnapshot(),
        overlay: facilitator.overlay?.kind ?? null,
      };
    }
    if (fill.workbook === null) return { stage: 'empty' };
    return {
      stage: 'fill',
      view: fill.mode,
      section: fill.section,
      focus: fill.focusId,
      maximised: fill.maximisedTile,
    };
  }

  constructor(deps: Deps) {
    this.#deps = deps;
    this.#history = createViewHistory<StageView>(
      (v) => this.#apply(v),
      sameStageView,
      isStageView,
    );
    onDestroy(() => this.#history.destroy());
    // The facilitator path pushes only when the SCREEN changes and replaces
    // otherwise; every coordinate of the fill stage IS a screen, so it always pushes.
    $effect(() => {
      const view = this.view;
      if (view.stage !== 'facilitator') {
        this.#history.reflect(view);
        return;
      }
      const screen = facilitatorScreenKey(view.section, view.history, view.overlay);
      if (screen === this.#lastScreen) {
        this.#history.baseline(view);
        return;
      }
      this.#lastScreen = screen;
      this.#history.reflect(view);
    });
  }

  /** Every load calls this: Back must not return to a view that referenced the
   *  artifact just discarded. */
  baseline(): void {
    this.#history.baseline(this.view);
  }

  /** The scroll is captured into the LIST entry before the detail entry is pushed,
   *  so Back returns to where the reader actually was. */
  openLanding(id: string, scroll: number): void {
    const { facilitator } = this.#deps;
    const base = facilitator.merge.historySnapshot() ?? NO_HISTORY_VIEW;
    this.#history.baseline({
      stage: 'facilitator',
      section: 'merge',
      selection: null,
      history: { ...base, landing: null, scroll, record: null },
      overlay: null,
    });
    facilitator.merge.history = { ...base, landing: id, scroll, record: null };
  }

  /** The entry Back returns to must already name the panel, so it is replaced
   *  before the section change pushes the Questions entry (the openLanding pattern). */
  inspectFromLanding(questionId: string, target: Target): void {
    const { facilitator, inspector } = this.#deps;
    const unitTarget: Target = $state.snapshot(target);
    const anchored = {
      ...(facilitator.merge.historySnapshot() ?? NO_HISTORY_VIEW),
      record: { kind: 'answer' as const, questionId, target: unitTarget },
    };
    facilitator.merge.history = anchored;
    this.#history.baseline({
      stage: 'facilitator',
      section: 'merge',
      selection: null,
      history: anchored,
      overlay: null,
    });
    inspector.show({ kind: 'question', questionId, target: unitTarget });
    facilitator.section = 'questions';
  }

  #apply(v: StageView): void {
    const { fill, facilitator, inspector } = this.#deps;
    if (v.stage === 'fill') {
      fill.mode = v.view;
      fill.section = v.section;
      fill.focusId = v.focus;
      fill.maximisedTile = v.maximised;
    }
    if (v.stage === 'facilitator') {
      facilitator.section = v.section;
      if (v.overlay === 'recommendations') facilitator.openRecommendations();
      else facilitator.overlay = null;
      inspector.selection = v.selection;
      facilitator.merge.history = v.history;
    }
  }
}

export function createStageRouter(deps: Deps): StageRouter {
  return new StageRouter(deps);
}

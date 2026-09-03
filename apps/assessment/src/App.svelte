<script lang="ts">
  import { untrack } from 'svelte';
  import type { Viewer } from '@csf/platform';
  import { AppShell } from '@csf/platform/ui/app-shell';
  import { ErrorBanner } from '@csf/platform/ui/error-banner';
  import {
    FACILITATOR_RULES,
    PARTICIPANT_RULES,
    RulebookPanel,
    createHelp,
  } from '@csf/platform/ui/rulebook';
  import {
    createInspector,
    inspectorTitle,
    type InspectSubject,
  } from '@csf/platform/ui/inspector';
  import * as AlertDialog from '@csf/platform/ui/alert-dialog';
  import { persistedView } from '@csf/platform/view-history';
  import { participantState } from '@csf/platform/participant-storage';
  import { facilitatorState } from '@csf/platform/facilitator-storage';
  import { createFacilitator } from './facilitator/facilitator.svelte';
  import { FACILITATOR_HINTS } from './facilitator/hints';
  import FacilitatorStage from './facilitator/facilitator-stage.svelte';
  import { createFill } from './fill/fill.svelte';
  import FillStage from './fill/fill-stage.svelte';
  import FinalizedEstate from './fill/finalized-estate.svelte';
  import InspectorRail from './inspector-rail.svelte';
  import NothingLoaded from './nothing-loaded.svelte';
  import ShellActions from './shell-actions.svelte';
  import { createLoad } from './load.svelte';
  import { createStageRouter } from './stage-router.svelte';
  import { isStageView, type StageView } from './stage-view';

  // The Assessment app SHELL: it restores the two personas, wires the services to
  // each other, and chooses a stage. It holds no lifecycle of its own — each one
  // lives in the controller that owns it (fill/, facilitator/, load, stage-router).

  // Restore in-progress work (invariant #7): the DATA from local storage, the VIEW
  // from history.state.
  const restoredFill = participantState.load();
  const restoredFacilitator = facilitatorState.load();
  const restoredView =
    restoredFill || restoredFacilitator !== null ? persistedView<StageView>(isStageView) : null;
  const restoredFillView = restoredView?.stage === 'fill' ? restoredView : null;
  const restoredFacilitatorView = restoredView?.stage === 'facilitator' ? restoredView : null;

  // Stamped here: the pure core reads neither clock nor environment (invariant #3).
  const viewer: Viewer = {
    locale: navigator.language === '' ? 'en-GB' : navigator.language,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // What the right rail is showing, wherever it was selected from. Created first —
  // both the facilitator and the router report into it.
  const inspector = createInspector();
  inspector.selection = restoredFacilitatorView?.selection ?? null;

  const fill = createFill(restoredFill, restoredFillView);
  const facilitator = createFacilitator(
    restoredFacilitator,
    restoredFacilitatorView?.section ?? restoredFacilitator?.section,
    inspector,
  );
  const router = createStageRouter({ fill, facilitator, inspector });
  const load = createLoad({ fill, facilitator, onApplied: () => router.baseline() });

  // The persona is DERIVED from the loaded artifact — a bare workbook is something
  // to prepare, a workbook-assessment something to fill. There is no role switch,
  // and Load guarantees the two are never both loaded.
  const facilitating = $derived(facilitator.active);

  // ONE app, TWO readers — the thunk reads the set the live persona needs. What a
  // seeding choice does to the reading and what a rung asserts are different cards
  // under the same icon.
  createHelp(() => (facilitating ? FACILITATOR_RULES : PARTICIPANT_RULES));

  // What the rail reads when nothing is selected. A facilitator screen names what to
  // click on it; the participant's rail always has its estate reading.
  const railPage = $derived<InspectSubject | null>(
    facilitating
      ? { kind: 'hint', title: 'Inspector', text: FACILITATOR_HINTS[facilitator.section] }
      : { kind: 'estate-reading', title: fill.isFinalized ? 'Estate floor' : 'Your slice' },
  );
  const railSubject = $derived<InspectSubject | null>(inspector.selection ?? railPage);

  // The panel's open state lives in the inspection session (so selecting something
  // always reveals it). It ALSO follows content presence, but only on that
  // TRANSITION, so in between the chevron toggles freely without this fighting it.
  const railActive = $derived(facilitating || fill.loaded);
  inspector.open = restoredFacilitator !== null || restoredFill !== null;
  let lastRailActive: boolean | null = null;
  $effect(() => {
    const active = railActive;
    untrack(() => {
      if (active !== lastRailActive) {
        inspector.open = active;
        lastRailActive = active;
      }
    });
  });
</script>

<AppShell
  title="Assessment"
  rightTitle={inspectorTitle(railSubject)}
  rightWidth={railSubject?.kind === 'question' ||
  railSubject?.kind === 'instrument-chip' ||
  railSubject?.kind === 'instrument-reading' ||
  railSubject?.kind === 'seal-ladder' ||
  railSubject?.kind === 'open-units' ||
  railSubject?.kind === 'heat-mark' ||
  railSubject?.kind === 'staircase-rung'
    ? '24rem'
    : '18rem'}
  bind:rightOpen={inspector.open}
>
  {#snippet actions()}
    <ShellActions {fill} {facilitator} {load} />
  {/snippet}

  {#snippet right()}
    <InspectorRail {fill} {facilitator} page={railPage} />
  {/snippet}

  <!-- Mounted unconditionally: it shows itself when help mode is on, and reads
       whichever rule set the live persona needs. -->
  {#snippet overlay()}
    <RulebookPanel />
  {/snippet}

  {#if facilitating}
    <FacilitatorStage
      {facilitator}
      {viewer}
      error={load.error}
      onAddPartial={() => load.open()}
      onOpenLanding={(id, scroll) => router.openLanding(id, scroll)}
      onOpenQuestion={(questionId, target) => router.inspectFromLanding(questionId, target)}
    />
  {:else if fill.answering}
    <FillStage {fill} {viewer} error={load.error} />
  {:else}
    <!-- Nothing loaded, or a finalized estate read whole: one centred column. -->
    <div class="mx-auto max-w-2xl space-y-4 p-6">
      <ErrorBanner message={load.error} />
      {#if fill.workbook && fill.estate !== null}
        <FinalizedEstate {fill} workbook={fill.workbook} estate={fill.estate} />
      {:else}
        <NothingLoaded onLoad={() => load.open()} />
      {/if}
    </div>
  {/if}
</AppShell>

<!-- Guards Load: the copy and the action both come from the load decision. bits-ui
     needs the FUNCTION-binding form to be controlled — a one-way `open={expr}`
     will not open it. -->
<AlertDialog.Root
  bind:open={() => load.gate !== null, (o) => { if (!o) load.dismiss(); }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{load.gate?.title ?? ''}</AlertDialog.Title>
      <AlertDialog.Description>{load.gate?.body ?? ''}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => load.confirm()}>
        {load.gate?.action ?? 'Continue'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

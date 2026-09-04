<script lang="ts">
  import type { Target, Viewer } from '@csf/platform';
  import { buttonVariants } from '@csf/platform/ui/button';
  import { MergeScreen } from '@csf/platform/ui/merge-screen';
  import type { Facilitator } from './facilitator.svelte';

  // One screen for the whole landing loop, or the invitation to start it. Everything
  // it does is a call on the merge — it holds no state and decides nothing.
  type Props = {
    facilitator: Facilitator;
    viewer: Viewer;
    /** The shell's one Load, reused here.*/
    onAddPartial: () => void;
    // Both of these PUSH a history entry, so the router owns them.
    onOpenLanding: (id: string, scroll: number) => void;
    onOpenQuestion: (questionId: string, target: Target) => void;
  };
  let { facilitator, viewer, onAddPartial, onOpenLanding, onOpenQuestion }: Props = $props();

  const merge = $derived(facilitator.merge);
</script>

{#if !merge.workbookAssessment || !merge.base}
  <div class="mx-auto max-w-3xl space-y-4">
    <h2 class="text-lg font-semibold text-foreground">Merge partials</h2>
    <p class="text-sm text-muted-foreground">
      Add a returned partial to begin — it carries the workbook-assessment inside
      it, so no separate file is needed. You can also start from the
      workbook-assessment you exported in Setup.
    </p>
    <button class={buttonVariants({ variant: 'default' })} onclick={onAddPartial}>
      Add partial
    </button>
  </div>
{:else}
  <MergeScreen
    workbookAssessment={merge.workbookAssessment}
    base={merge.base}
    ledger={merge.ledger}
    review={merge.review}
    summary={merge.summary}
    checks={merge.checks}
    incomingName={merge.incoming?.meta.participant?.name ?? null}
    resolutions={merge.resolutions}
    partyDecisions={merge.partyDecisions}
    note={merge.note}
    history={merge.history}
    {viewer}
    selected={merge.history?.record ?? null}
    onNote={(v) => (merge.note = v)}
    onSelectRecord={(ref) => merge.selectRecord(ref)}
    onOpenNeighbor={(id) => merge.openNeighbor(id)}
    onOpenQuestion={onOpenQuestion}
    onHistory={(v) => (merge.history = v)}
    onOpenLanding={onOpenLanding}
    onAddPartial={onAddPartial}
    onResolve={(r) => merge.resolve(r)}
    onDecide={(d) => merge.decide(d)}
    onLand={() => merge.land()}
    onDiscard={() => merge.discard()}
  />
{/if}

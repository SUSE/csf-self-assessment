<script lang="ts">
  import type { ClashChoice, ClashResolution, Target, WorkbookAssessment } from '../../schema';
  import type { LandingClash } from '../../merge';
  import { NO_FILTER, filterClashes, queueFacets, queueGroups } from '../../merge';
  import type { QueueFilter } from '../../merge';
  import { questionOf, targetKey } from '../../assessment';
  import { Button } from '../button';
  import { Panel, PanelHeader } from '../panel';
  import { ConflictCard, GrainConflictCard } from '../conflict-card';
  import QueueFilterBar from './queue-filter-bar.svelte';
  import QueueGroupShell from './queue-group.svelte';

  // The clash queue at scale: the landing's clashes grouped
  // by objective and narrowable. It owns view state only — every list, count and
  // decision comes from merge/queue.ts .
  
  // Every clash is decided ONE AT A TIME, on its own card: there is no bulk
  // apply and no per-card keyboard layer.
  
  // Bulk apply existed, constrained to one narrowed class, and is gone
  // : a suggestion sits on nearly every divergence, so "apply the
  // suggestion to these 22" was the rubber stamp the constraint was meant to
  // prevent — narrowing a list is not reviewing it. What replaced it is the
  // `Show: Open / Decided` narrowing, which lets the facilitator work the
  // remainder down without deciding anything on their behalf.
  
  // The keyboard layer (`card-keys.ts`) belongs to the answering surface, where
  // the ladder is a real radiogroup and every option is reachable. In a clash the
  // option set is not a ladder: two candidate answers and a suggestion sit beside
  // the rungs, and digits could only ever reach the rungs.
  type Props = {
    workbookAssessment: WorkbookAssessment;
    clashes: LandingClash[];
    resolutions: ClashResolution[];
    incomingName: string;
    onResolve: (resolution: ClashResolution) => void;
  };
  let { workbookAssessment, clashes, resolutions, incomingName, onResolve }: Props = $props();

  let filter = $state<QueueFilter>(NO_FILTER);
  let collapsed = $state<Record<string, boolean>>({});
  // Per-clash draft notes, keyed by clash key. Kept local: a note only becomes
  // data when a resolution is emitted.
  let notes = $state<Record<string, string>>({});

  const workbook = $derived(workbookAssessment.workbook);
  const shown = $derived(filterClashes(clashes, workbook, filter, resolutions));
  const groups = $derived(queueGroups(shown, workbook, resolutions));
  const facets = $derived(queueFacets(clashes, workbook, filter, resolutions));
  // How much of the WHOLE queue is settled — the facets' own decided count is
  // faceted (it holds the other narrowings), which is right for the control and
  // wrong for a sentence about the queue.
  const decided = $derived(
    filterClashes(clashes, workbook, { ...NO_FILTER, status: 'decided' }, resolutions).length,
  );

  function keyOf(questionId: string, target: Target): string {
    return `${questionId}:${targetKey(target)}`;
  }
  function noteFor(clash: LandingClash): string {
    return (notes[keyOf(clash.questionId, clash.target)] ?? '').trim();
  }
  function resolutionFor(clash: LandingClash): ClashResolution | undefined {
    return resolutions.find((r) => keyOf(r.questionId, r.target) === keyOf(clash.questionId, clash.target));
  }
  function choose(clash: LandingClash, choice: ClashChoice): void {
    onResolve({ questionId: clash.questionId, target: clash.target, choice, note: noteFor(clash) });
  }
  function note(clash: LandingClash, text: string): void {
    notes[keyOf(clash.questionId, clash.target)] = text;
    const existing = resolutionFor(clash);
    if (existing !== undefined) {
      onResolve({ ...existing, note: text.trim() });
    }
  }
</script>

<!-- A Panel, like every other section of the Merge review (ui/panel). The queue is
     the deepest thing on this screen — panel → objective well → clash card →
     candidate inset — so it is also where the ramp has to be read as one system. -->
<Panel class="space-y-4" aria-label="Clash queue" data-clash-queue>
  <PanelHeader title="Clashes" />

  <!-- Nothing to narrow: with no clashes every control in the bar is inert, and a
     bar of zeroes blames a filter for an empty queue. Say what is true instead. -->
  {#if clashes.length === 0}
    <p class="text-sm text-muted-foreground" data-clash-queue-empty>
      No clashes — every incoming answer either agreed with the estate or is the only source for
      its unit.
    </p>
  {:else}
    <QueueFilterBar {filter} {facets} onFilter={(next) => (filter = next)} />
  {/if}

  <!-- A narrowing that shows nothing must say so: an empty list under a filled
     bar reads as "the queue is done", which is the one thing it must never
     imply. The way out is offered here, beside the emptiness it explains. -->
  {#if clashes.length > 0 && shown.length === 0}
    <div class="flex flex-wrap items-center gap-2" data-clash-queue-none>
      <p class="text-sm text-muted-foreground">
        No clash matches this narrowing — {decided} of {clashes.length} clashes are decided.
      </p>
      <Button variant="outline" size="sm" onclick={() => (filter = NO_FILTER)}>
        Show every clash
      </Button>
    </div>
  {/if}

  {#each groups as group (group.objectiveId)}
    <QueueGroupShell
      {group}
      collapsed={collapsed[group.objectiveId] === true}
      onToggle={() => (collapsed[group.objectiveId] = !(collapsed[group.objectiveId] === true))}
    >
      {#each group.clashes as clash (keyOf(clash.questionId, clash.target))}
        {@const key = keyOf(clash.questionId, clash.target)}
        {@const question = questionOf(workbook, clash.questionId)}
        {#if question !== undefined}
          <li data-clash-key={key}>
            {#if clash.kind === 'grain-clash'}
              <GrainConflictCard
                {clash}
                {question}
                {workbookAssessment}
                {incomingName}
                resolution={resolutionFor(clash)}
                note={notes[key] ?? ''}
                onChoose={(choice) => choose(clash, choice)}
                onNote={(text) => note(clash, text)}
              />
            {:else}
              <ConflictCard
                {clash}
                {question}
                {workbookAssessment}
                {incomingName}
                resolution={resolutionFor(clash)}
                note={notes[key] ?? ''}
                onChoose={(choice) => choose(clash, choice)}
                onNote={(text) => note(clash, text)}
              />
            {/if}
          </li>
        {/if}
      {/each}
    </QueueGroupShell>
  {/each}
</Panel>

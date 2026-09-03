<script lang="ts">
  import { estateWheelTile, type WeakestLink } from '../../analytics';
  import type { Party, Question, Workbook } from '../../schema';
  import type { EngineResult } from '../../score-engine';
  import QuestionRow from '../workbook-facts/question-row.svelte';
  import InspectionHeader from './inspection-header.svelte';

  // ONE Inspector view: the asserted material answers on one Estate wheel axis,
  // weakest first. Derived from the live reading every render, so a removed spoke
  // resolves to nothing rather than keeping stale questions in the rail.
  type Props = {
    result: EngineResult | null;
    workbook: Workbook | null;
    parties: Party[];
    spokeKey: string;
    onOpenQuestion?: ((id: string) => void) | undefined;
  };
  let { result, workbook, parties, spokeKey, onOpenQuestion }: Props = $props();

  type Row = WeakestLink & { question: Question };

  const view = $derived(
    result && workbook ? estateWheelTile(result, workbook, parties) : null,
  );
  const spoke = $derived(
    view?.kind === 'wheel'
      ? (view.spokes.find((candidate) => candidate.key === spokeKey) ?? null)
      : null,
  );
  const rows = $derived.by((): Row[] => {
    if (view?.kind !== 'wheel' || spoke === null || workbook === null) return [];
    const questions = new Map(
      workbook.objectives.flatMap((objective) =>
        objective.questions.map((question) => [question.id, question]),
      ),
    );
    return view.links.flatMap((link) => {
      if (link.spoke !== spoke.key) return [];
      const question = questions.get(link.questionId);
      return question ? [{ ...link, question }] : [];
    });
  });
</script>

<div data-estate-spoke-inspection class="flex h-full min-h-0 flex-col text-sm">
  {#if view === null}
    <p class="p-1 text-xs text-muted-foreground">
      Load a reading, then press an Estate wheel spoke to inspect it.
    </p>
  {:else if view.kind === 'empty'}
    <p class="p-1 text-xs text-muted-foreground">
      The Estate wheel has no asserted material answers yet.
    </p>
  {:else if spoke === null}
    <p class="p-1 text-xs text-muted-foreground">
      This Estate wheel spoke is no longer in the live reading. Press another spoke.
    </p>
  {:else if rows.length === 0}
    <InspectionHeader
      title={spoke.label}
      count="0 answers"
      note="This spoke has no asserted material answers." />
  {:else}
    <InspectionHeader
      title={spoke.label}
      count={`${rows.length} ${rows.length === 1 ? 'answer' : 'answers'}`}
      note="Asserted material answers on this spoke, weakest first." />

    <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pt-3">
      {#each rows as row, i (`${i}:${row.key}`)}
        <QuestionRow
          question={row.question}
          seal={row.seal}
          scope={row.scope}
          onSelect={onOpenQuestion} />
      {/each}
    </ul>
  {/if}
</div>

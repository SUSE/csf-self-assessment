<script lang="ts">
  import type { ReviewSummary } from '../../merge';
  import { Button } from '../button';
  import { Panel } from '../panel';
  import { Textarea } from '../forms';

  // The header of the partial under review: who it is, what
  // landing it would do, and the two irreversible controls. Computes no truth —
  // every number arrives in `summary`.
  type Props = {
    name: string;
    summary: ReviewSummary;
    note: string;
    onNote: (value: string) => void;
    canLand: boolean;
    onLand: () => void;
    onDiscard: () => void;
  };
  let { name, summary, note, onNote, canLand, onLand, onDiscard }: Props = $props();

  const undecided = $derived(summary.clashes - summary.decided);

  function count(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
  }
</script>

<!-- Every section on the Merge review wears the same Panel (ui/panel): a plane
     lifted off the canvas. It used to be a hairline box, which was the same
     border the objective groups, the clash cards and the candidate boxes inside
     them wore — four depths, one line, no containment. -->
<Panel class="space-y-3" aria-label="Landing">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="space-y-1">
      <h3 class="text-sm font-medium text-foreground">{name}</h3>
      <p class="text-sm text-muted-foreground" data-landing-summary>
        {count(summary.answers, 'answer', 'answers')} · {count(summary.newUnits, 'new unit', 'new units')} ·
        {count(summary.clashes, 'clash', 'clashes')}{summary.clashes > 0
          ? ` · ${summary.decided} decided`
          : ''}
      </p>
    </div>
    <!-- The note sits BETWEEN the summary and the two irreversible controls, and
     takes every pixel between them: it is the one thing on this row a
     facilitator writes rather than reads, and a single line pretended the
     reason a partial landed fits in six words. It grows into the slack only
     to a readable measure (~70 characters at this size) and then stops, so
     `ml-auto` takes the rest and the field stays pinned to the controls it
     belongs with. Below `basis`, flex-wrap drops it onto its own line. -->
    <Textarea
      rows={3}
      class="ml-auto min-w-0 max-w-lg flex-1 basis-64"
      aria-label="Facilitator note"
      placeholder="Facilitator note (optional)"
      value={note}
      oninput={(e) => onNote(e.currentTarget.value)}
    />
    <!-- Centred against the note rather than top-aligned with it: the row's other
     two items are read from their first line down, the controls are one
     object, and hanging them off the note's top edge left them adrift over
     two empty rows. `self-center` alone — the summary stays top-aligned. -->
    <div class="flex flex-wrap items-center gap-2 self-center">
      <Button disabled={!canLand} onclick={onLand} aria-label="Land">Land</Button>
      <Button variant="outline" onclick={onDiscard} aria-label="Discard partial">Discard</Button>
    </div>
  </div>
  {#if undecided > 0}
    <p class="text-xs text-warning-ink">
      {count(undecided, 'clash', 'clashes')} undecided
    </p>
  {/if}
  {#if summary.collisions > 0}
    <p class="text-xs text-warning-ink" data-collisions>
      {count(summary.collisions, 'provider id collision', 'provider id collisions')} undecided
    </p>
  {/if}
</Panel>

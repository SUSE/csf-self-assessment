<script lang="ts">
  import type { ObjectiveArc } from '../../analytics';

  // The per-objective table print gets and the screen declines (report.md §2.3.1).
  // Derives nothing: every cell is read off the arc, and absence is a dash rather
  // than a zero (analytics invariant #2).
  type Props = { arcs: ObjectiveArc[] };

  let { arcs }: Props = $props();

  const stands = (arc: ObjectiveArc): string =>
    arc.standing.kind === 'asserted'
      ? `SEAL-${arc.standing.seal}`
      : arc.standing.kind === 'ranked'
        ? 'ranked, not gated'
        : arc.standing.kind === 'informational'
          ? 'informational'
          : 'not yet answered';

  const score = (arc: ObjectiveArc): string =>
    arc.standing.kind === 'asserted' || arc.standing.kind === 'ranked'
      ? arc.standing.score.toFixed(1)
      : '—';
</script>

<!-- The block wrapper is what carries the no-split rule: Chrome honours
     `break-inside` on a block container, not reliably on a `<table>` box. -->
<div data-report-objectives>
  <table class="w-full text-left text-sm">
    <thead class="text-muted-foreground">
      <tr>
        <th scope="col" class="py-1 font-medium">Objective</th>
        <th scope="col" class="py-1 font-medium">Weight</th>
        <th scope="col" class="py-1 font-medium">Standing</th>
        <th scope="col" class="py-1 font-medium">Score</th>
      </tr>
    </thead>
    <tbody class="text-card-foreground">
      {#each arcs as arc (arc.id)}
        <tr>
          <td class="py-1">{arc.name}</td>
          <td class="py-1">{arc.weight}%</td>
          <td class="py-1">{stands(arc)}</td>
          <td class="py-1">{score(arc)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

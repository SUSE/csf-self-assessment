<script lang="ts">
  import RungRow from './rung-row.svelte';
  import type { LadderRung } from './model';

  // The answer ladder as a read-only readout: every rung a participant chooses
  // between, in authored order, each marked when a unit selected it and the
  // lowest selected flagged as the binding result. A pure render of a prepared
  // model (see model.answerLadder) — it counts nothing.
  type Props = { rungs: LadderRung[] };
  let { rungs }: Props = $props();
</script>

<section class="space-y-1.5">
  <h4 class="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Answer ladder</h4>
  <ul class="space-y-1">
    {#each rungs as rung (rung.rungId)}
      <RungRow {rung} />
    {/each}
  </ul>
</section>

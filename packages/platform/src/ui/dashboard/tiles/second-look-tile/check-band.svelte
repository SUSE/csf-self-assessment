<script lang="ts">
  import { CHECK_META, type SecondLookTile } from '../../../../analytics';
  import CheckDial from './check-dial.svelte';

  // Five equal columns, never wrapped: the five dials ARE the check set, and a 4 + 1
  // break reads as a sixth check missing. Narrowing squeezes the columns instead. The
  // dials subgrid onto these four rows, so a title that wraps in one column moves the
  // counts in all five.
  let { view }: { view: SecondLookTile } = $props();

  const dials = $derived(
    CHECK_META.map((meta) => ({
      ...meta,
      check: view.kind === 'flagged' ? (view.checks.find((c) => c.id === meta.id) ?? null) : null,
    })),
  );
</script>

<div class="grid grid-cols-5 grid-rows-[auto_auto_auto_auto] gap-x-1 gap-y-1.5">
  {#each dials as dial (dial.id)}
    <CheckDial id={dial.id} title={dial.title} subject={dial.subject} check={dial.check} />
  {/each}
</div>

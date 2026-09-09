<script lang="ts">
  import type { CheckId, ConsistencyCheck } from '../../../../analytics';
  // Deep imports, not the inspector barrel: it pulls the whole rail in with it.
  import { getInspector } from '../../../inspector/inspector.svelte';
  import type { InspectSelection } from '../../../inspector/subject';
  import CheckRing from './check-ring.svelte';

  // One of the five checks, at tile size: its dial, its name, and what its ratio
  // counts. Pressing it puts the check's own words in the rail — the two facts, the
  // question, and the units to ask about.
  
  // A clear check is a mark, never a control: there is nothing to read behind it.
  let {
    id,
    title,
    subject,
    check,
  }: {
    id: CheckId;
    title: string;
    /** What the ratio counts — `critical dimensions`, `gating claims`.*/
    subject: string;
    /** Null where the check found nothing to ask about.*/
    check: ConsistencyCheck | null;
  } = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection | null>(
    check ? { kind: 'consistency-check', checkId: check.id } : null,
  );
  const showing = $derived(selection ? (inspector?.isShowing(selection) ?? false) : false);
  const opens = $derived(
    check === null ? null : check.opens.length === 0 ? 'none to open' : `${check.opens.length} to open`,
  );
  // The column takes the band's own four rows, so a title that wraps in one dial moves
  // the line under it in all five.
  const column =
    'row-span-4 grid min-w-0 grid-rows-subgrid justify-items-center rounded-md px-1 py-1 text-center';
</script>

{#snippet body()}
  <CheckRing part={check?.ratio.part ?? 0} whole={check?.ratio.whole ?? 0} />
  <p class="text-sm font-semibold text-card-foreground">{title}</p>
  <p class="text-xs text-muted-foreground">{check === null ? 'clear' : subject}</p>
  {#if opens}
    <p class="text-xs text-muted-foreground tabular-nums">{opens}</p>
  {/if}
{/snippet}

{#if check && inspector && selection}
  <button
    type="button"
    data-check-dial={id}
    aria-pressed={showing}
    title={check.question}
    onclick={() => inspector.show(selection)}
    class={`${column} cursor-pointer focus-visible:outline-2 focus-visible:outline-foreground ${
      showing ? 'bg-muted' : 'hover:bg-muted'
    }`}>
    {@render body()}
  </button>
{:else}
  <div data-check-dial={id} class={column}>
    {@render body()}
  </div>
{/if}

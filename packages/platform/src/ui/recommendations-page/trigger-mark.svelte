<script lang="ts">
  import type { RecommendationCard } from '../../analytics';
  import { cn } from '../../utils/cn';
  import { getInspector } from '../inspector/inspector.svelte';
  import type { InspectSelection } from '../inspector/subject';
  import FiredLinkChip from './fired-link-chip.svelte';

  // Why this offer fired, in one line — and where a session runs, the press that
  // fills the rail with the rest of it. With no session it is the reading only:
  // there is nothing to report to, so nothing claims to be pressable.
  let { card }: { card: RecommendationCard } = $props();

  const inspector = getInspector();
  const selection = $derived<InspectSelection>({
    kind: 'recommendation',
    recommendationId: card.id,
  });
  const showing = $derived(inspector?.isShowing(selection) ?? false);
</script>

{#snippet reading()}
  <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
    Why you are seeing this
  </span>
  <FiredLinkChip fired={card.trigger} trigger />
{/snippet}

{#if inspector}
  <button
    type="button"
    data-inspect-recommendation={card.id}
    aria-pressed={showing}
    onclick={() => inspector.show(selection)}
    class={cn(
      'flex cursor-pointer flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      showing ? 'border-border bg-accent/60' : 'border-transparent hover:bg-accent/40',
    )}
  >
    {@render reading()}
  </button>
{:else}
  <p class="flex flex-wrap items-center gap-2 px-2 py-1">{@render reading()}</p>
{/if}

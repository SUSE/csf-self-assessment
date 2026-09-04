<script lang="ts">
  import type { Recommendation, Seal } from '../../schema';
  import { buttonVariants } from '../button';
  import * as Popover from '../popover';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import RecommendationBadges from './recommendation-badges.svelte';

  // The picker for "which offer points here": a real list, not a native select,
  // because a bare `<option>` can carry only a string — and choosing between
  // offers means reading the horizon and the trigger SEAL beside the title. One
  // press links. the popover closes behind it.
  type Props = {
    /** Everything not already linked to this target, in workbook order.*/
    candidates: Recommendation[];
    sealName: (seal: Seal) => string;
    onLink: (recommendationId: string) => void;
  };
  let { candidates, sealName, onLink }: Props = $props();

  let open = $state(false);

  function pick(id: string): void {
    open = false;
    onLink(id);
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
    Link a recommendation
    <ChevronDown class="size-3.5 text-muted-foreground" />
  </Popover.Trigger>
  <Popover.Content class="w-[min(34rem,calc(100vw-2rem))] p-1" aria-label="Link a recommendation">
    <ul class="max-h-80 overflow-y-auto">
      {#each candidates as recommendation (recommendation.id)}
        <li>
          <button
            type="button"
            class="flex w-full flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onclick={() => pick(recommendation.id)}
          >
            <span class="min-w-0 flex-1 truncate text-xs text-foreground">
              {recommendation.title || '(untitled recommendation)'}
            </span>
            <RecommendationBadges {recommendation} sealName={sealName(recommendation.whenAtOrBelow)} />
          </button>
        </li>
      {/each}
    </ul>
  </Popover.Content>
</Popover.Root>

<script lang="ts">
  import type { RecommendationLink, Seal, Workbook } from '../../schema';
  import { linkRecommendation, linkStanding, unlinkRecommendation } from '../../author';
  import { sealName } from '../../score-engine';
  import { Inset, eyebrowVariants } from '../panel';
  import RecommendationLinkEntry from './recommendation-link-entry.svelte';
  import RecommendationLinkPicker from './recommendation-link-picker.svelte';

  // The Recommendations row inside the question / objective editor: which
  // authored offers point HERE, what each one claims, and the picker that adds
  // another. Linking is explicit — the association is never inferred from
  // wording or dimension.
  type Props = {
    draft: Workbook;
    /** The thing being edited, as the link that would point at it. */
    target: RecommendationLink;
    onDraft: (next: Workbook) => void;
    /** Open a linked recommendation's own editor. */
    onOpen?: ((recommendationId: string) => void) | undefined;
  };
  let { draft, target, onDraft, onOpen }: Props = $props();

  const standing = $derived(linkStanding(draft, target));

  const levelName = (seal: Seal): string => sealName(draft.sealLevels, seal);
</script>

<Inset density="xs" class="space-y-2 rounded-md" data-rule="recommendation-link">
  <p class={eyebrowVariants()}>Recommendations</p>
  {#if standing.linked.length === 0}
    <p class="text-xs text-muted-foreground">No recommendation points here.</p>
  {:else}
    <ul class="space-y-1">
      {#each standing.linked as recommendation (recommendation.id)}
        <RecommendationLinkEntry
          {recommendation}
          sealName={levelName(recommendation.whenAtOrBelow)}
          {onOpen}
          onUnlink={() => onDraft(unlinkRecommendation(draft, recommendation.id, target))}
        />
      {/each}
    </ul>
  {/if}
  {#if standing.unlinked.length > 0}
    <RecommendationLinkPicker
      candidates={standing.unlinked}
      sealName={levelName}
      onLink={(id) => onDraft(linkRecommendation(draft, id, target))}
    />
  {/if}
</Inset>

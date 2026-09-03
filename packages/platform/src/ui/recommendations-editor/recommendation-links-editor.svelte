<script lang="ts">
  import type { Recommendation, RecommendationLink, Workbook } from '../../schema';
  import {
    LINK_KINDS,
    LINK_KIND_LABELS,
    linkRecommendation,
    linkTargets,
    unlinkRecommendation,
    type RecommendationLinkKind,
  } from '../../author';
  import { Inset, eyebrowVariants } from '../panel';
  import RecommendationTargetEntry from './recommendation-target-entry.svelte';
  import RecommendationTargetPicker from './recommendation-target-picker.svelte';

  // The links OF one recommendation: what it points at, plus the picker that
  // adds another. A link is explicit and typed — nothing here infers one.
  
  // Built in the same vocabulary as RecommendationLinksRow, which shows this
  // very relation from the other end inside the question and objective editors:
  // a recessed Inset carrying an eyebrow, entries that sit UP out of it on the
  // card surface, then the control that adds one. The two ends of one relation
  // had no business looking like two different features.
  type Props = {
    draft: Workbook;
    recommendation: Recommendation;
    onDraft: (next: Workbook) => void;
  };
  let { draft, recommendation, onDraft }: Props = $props();

  let kind = $state<RecommendationLinkKind>('question');
  // '' means "nothing picked yet" — the kind's first target stands in, so the
  // initial value is derived rather than read off `draft` at construction.
  let picked = $state('');

  const targets = $derived(linkTargets(draft, kind));
  const targetId = $derived(picked === '' ? (targets[0]?.id ?? '') : picked);

  // A dangling link (its target was renamed outside a cascade, or the workbook
  // was hand-edited) must read as its raw id, never as blank.
  function labelFor(link: RecommendationLink): string {
    return linkTargets(draft, link.kind).find((t) => t.id === link.id)?.label ?? link.id;
  }

  // Resetting the id belongs HERE, in the kind chooser's own handler — an
  // $effect that watched `kind` would write the state it derives from.
  function pickKind(raw: string): void {
    const next = LINK_KINDS.find((k) => k === raw);
    if (next === undefined) return;
    kind = next;
    picked = '';
  }
</script>

<Inset density="xs" class="space-y-2 rounded-md" data-rule="recommendation-link">
  <p class={eyebrowVariants()}>Links</p>
  {#if recommendation.links.length === 0}
    <p class="text-xs text-muted-foreground">
      Not linked yet — a recommendation with no link never fires.
    </p>
  {:else}
    <ul class="space-y-1">
      {#each recommendation.links as link (`${link.kind}:${link.id}`)}
        <RecommendationTargetEntry
          kindLabel={LINK_KIND_LABELS[link.kind]}
          label={labelFor(link)}
          onUnlink={() => onDraft(unlinkRecommendation(draft, recommendation.id, link))}
        />
      {/each}
    </ul>
  {/if}
  <RecommendationTargetPicker
    {kind}
    {targets}
    {targetId}
    onKind={pickKind}
    onTarget={(id) => (picked = id)}
    onLink={() => onDraft(linkRecommendation(draft, recommendation.id, { kind, id: targetId }))}
  />
</Inset>

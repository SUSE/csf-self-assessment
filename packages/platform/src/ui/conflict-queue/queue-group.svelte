<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { QueueGroup } from '../../merge';
  import { Button } from '../button';
  import { Well } from '../panel';

  // One objective's clashes (merge.md §4.2): a header that states the group's size
  // and its decided count, plus the collapse toggle.
  // Presentational — every number arrives already computed (invariant #13).
  //
  // A Well, not a fourth hairline box (ui/panel): the group is a compartment cut
  // into the Clashes panel, and the cards inside it sit back up at the panel's own
  // surface. Recessing the container instead of outlining it is what makes the
  // depth read — the group used to wear the same 1px border as the panel around it
  // and the cards within it, so three levels of containment came out as three
  // identical lines.
  //
  // There is deliberately NO per-group "reviewed" tick. A checkbox at the head of
  // a list of items reads as *select these for an action*, and this queue has no
  // per-group action to select for — every decision is per clash. The tick it
  // actually was marked progress by hand, persisted nowhere, and its only effect
  // was to collapse the group, which Hide already does; meanwhile `decided`
  // counts the same progress from the resolutions themselves and cannot be
  // wrong. Adapted from the PR "Viewed" tick, it was the one borrowed technique
  // with no counterpart here.
  type Props = {
    group: QueueGroup;
    collapsed: boolean;
    onToggle: () => void;
    children: Snippet;
  };
  let { group, collapsed, onToggle, children }: Props = $props();

  // Ratios, not a percentage: the two segments are `flex` weights over the counts
  // themselves, so the meter draws from the same two numbers the sentence beside it
  // reads and there is no arithmetic here to disagree with the core (invariant #13).
  const remaining = $derived(group.clashes.length - group.decided);
</script>

<Well
  as="section"
  density="xs"
  class="space-y-2"
  aria-label={`Group ${group.objectiveId}`}
  data-group={group.objectiveId}
  data-collapsed={collapsed}
>
  <div class="space-y-1.5">
    <div class="flex flex-wrap items-center gap-3">
      <span class="text-sm font-semibold text-foreground">{group.objectiveId} · {group.name}</span>
      <span class="text-xs text-muted-foreground">
        {group.clashes.length} clashes · {group.decided} decided
      </span>
      <Button
        variant="outline"
        size="sm"
        class="ml-auto"
        aria-label={`Toggle ${group.objectiveId}`}
        onclick={onToggle}
      >
        {collapsed ? 'Show' : 'Hide'}
      </Button>
    </div>

    <!-- What is left, drawn where it can be read with the group CLOSED — which is
         the state a worked-down queue spends most of its time in, and the one the
         count alone was too quiet for. The remainder is the coloured part, not the
         progress: amber is this product's "act here" and the only thing here that
         wants a facilitator is the undecided tail. A finished group's meter is
         therefore entirely neutral, and the whole panel visibly settles as it is
         worked down. The sentence above carries the same fact in words, so nothing
         here is colour-only. -->
    <div class="flex h-0.5 overflow-hidden rounded-full bg-border" aria-hidden="true" data-group-meter>
      <div class="bg-foreground/40" style="flex: {group.decided}"></div>
      <div class="bg-warning" style="flex: {remaining}"></div>
    </div>
  </div>

  {#if !collapsed}
    <ol class="space-y-3">{@render children()}</ol>
  {/if}
</Well>

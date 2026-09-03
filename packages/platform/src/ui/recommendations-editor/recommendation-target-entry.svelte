<script lang="ts">
  import X from '@lucide/svelte/icons/x';

  // ONE thing this recommendation points at: what kind of thing it is, which
  // one, and the way to detach it. The mirror of RecommendationLinkEntry, which
  // says the same relation from the other end — that one lists the offers
  // pointing AT a question, this one lists the targets an offer points at.
  //
  // The kind sits in a fixed column so a stack of entries reads as two columns
  // rather than as ragged prose, and the detach control is a drawn icon rather
  // than a multiplication sign standing in for one.
  type Props = {
    kindLabel: string;
    /** The target's own label, or its raw id when the target has gone missing. */
    label: string;
    onUnlink: () => void;
  };
  let { kindLabel, label, onUnlink }: Props = $props();
</script>

<li class="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs">
  <span class="w-20 shrink-0 text-muted-foreground">{kindLabel}</span>
  <span class="min-w-0 flex-1 truncate text-foreground">{label}</span>
  <button
    type="button"
    class="shrink-0 rounded text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    aria-label={`Unlink ${kindLabel} ${label}`}
    onclick={onUnlink}
  >
    <X class="size-4" />
  </button>
</li>

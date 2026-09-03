<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button } from '../button';

  /** The narrow-width bar that keeps Back, the current record identity and the
   * Affected records trigger visible while the changes column scrolls (§4.9).*/
  type Props = {
    /** The Landing's generated title — what the bar reads when nothing is anchored.*/
    title: string;
    /** The anchored record's label, or null.*/
    current: string | null;
    onBack: () => void;
    /** The Affected records trigger. A bits-ui `Sheet.Trigger` renders its own
     * button, so the sheet's owner passes it in rather than the bar owning state.*/
    trigger: Snippet;
  };
  let { title, current, onBack, trigger }: Props = $props();
</script>

<div
  data-detail-bar
  class="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background py-1 md:hidden"
>
  <Button variant="ghost" size="sm" aria-label="Landing history" data-detail-bar-back onclick={onBack}>
    ← Landing history
  </Button>
  <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground" data-detail-bar-current
    >{current ?? title}</span
  >
  {@render trigger()}
</div>

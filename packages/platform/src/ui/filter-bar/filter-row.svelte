<script lang="ts">
  import type { Snippet } from 'svelte';

  // One narrowing of a list: what it narrows, then its options. The visible
  // label is the point of this part — two unlabelled option strips side by
  // side, each of them starting with "All", say nothing about what they select,
  // which is exactly how the merge queue's bar became unreadable.
  type Props = { label: string; children: Snippet };
  let { label, children }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
  <span class="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
  {@render children()}
</div>

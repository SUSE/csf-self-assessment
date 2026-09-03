<script lang="ts">
  // A facet the whole question shares, named once on its identity line
  // (question-identity idiom). Fixed small radius, never a pill: round is reserved for
  // what can be picked up or previewed, and this is a fact.
  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{@render children()}</span>

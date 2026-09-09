<script lang="ts">
  // One side of a check, named. Side by side is the tile's old layout. in a 20rem rail
  // the two facts stack, so each has to say which kind of fact it is (§2.8).
  let { label, text }: { label: string; text: string } = $props();
</script>

<div data-check-fact={label}>
  <p class="text-xs font-semibold text-muted-foreground">{label}</p>
  <p class="text-sm text-card-foreground">{text}</p>
</div>

<script lang="ts">
  // One tone of the band, named — the swatch is the band's own paint at its own height.
  let { paint, label }: { paint: string; label: string } = $props();
</script>

<span class="flex items-center gap-1.5">
  <span aria-hidden="true" class={`block h-1.5 w-3 rounded ${paint}`}></span>
  {label}
</span>

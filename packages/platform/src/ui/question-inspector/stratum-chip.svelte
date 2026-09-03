<script lang="ts">
  import type { Seal } from '../../schema';

  // A stratum of a dimension, named as a pill: the ◇ diamond idiom the wheels use
  // for a layer, in text form for a dense list row. An optional selected SEAL
  // trails the name when a split dimension was answered per-stratum. omit it (or
  // pass null) and the pill just names the stratum.
  type Props = { stratum: string; seal?: Seal | null };
  let { stratum, seal = null }: Props = $props();
</script>

<span class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-3xs text-muted-foreground">
  <span aria-hidden="true">◇</span>{stratum}
  {#if seal !== null}<span class="font-semibold text-foreground">· SEAL-{seal}</span>{/if}
</span>

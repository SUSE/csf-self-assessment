<script lang="ts">
  import type { Dimension } from '../../schema';
  import { RecordRow } from '../record-table';

  // One dimension, read-only: what a question can be asked about, the layers within
  // it, and whether the SEAL gate reads it. The flag is a glyph with a name on it —
  // a bare ⚑ in a column headed "critical" is legible to the eye but silent to a
  // screen reader, and an unflagged row must say the fact too, not just be blank.
  type Props = {
    dimension: Dimension;
  };
  let { dimension }: Props = $props();

  const strata = $derived(dimension.strata ?? []);
</script>

<RecordRow id={dimension.id}>
  <td class="truncate font-mono text-muted-foreground">{dimension.id}</td>
  <td class="truncate text-foreground">{dimension.name}</td>
  <td class="truncate text-muted-foreground" title={strata.join(', ') || undefined}
    >{strata.join(', ') || '—'}</td
  >
  <td class="text-center">
    {#if dimension.critical}
      <span title="Critical — the SEAL gate reads this dimension" aria-label="Critical">⚑</span>
    {:else}
      <span class="text-muted-foreground" aria-label="Not critical">—</span>
    {/if}
  </td>
</RecordRow>

<script lang="ts">
  import type { BodyBlock } from '../../analytics';

  let { block }: { block: BodyBlock } = $props();
</script>

{#if block.kind === 'paragraph'}
  <p class="max-w-prose text-sm text-card-foreground">{block.text}</p>
{:else}
  <ul class="max-w-prose space-y-1">
    {#each block.items as item, i (i)}
      <li class="flex gap-2 text-sm text-card-foreground">
        <span aria-hidden="true" class="text-muted-foreground">—</span>
        {item}
      </li>
    {/each}
  </ul>
{/if}

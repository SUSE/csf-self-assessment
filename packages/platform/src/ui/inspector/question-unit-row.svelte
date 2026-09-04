<script lang="ts">
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import { ReadingMark } from '../seal-badge';
  import type { ReadingView } from './question-blocks';

  // One unit of a question in the rail: the mark carries the reading, the line names
  // what the unit is. Rendered plain — the block it sits in is the recessed surface.
  
  // `inline` is a question with a single unit whose facts are all stated above it —
  // the mark joins the identity line instead of sitting alone in a well. Otherwise a
  // row always says a word, so an empty `facet` falls back to the reading's own.
  let {
    facet,
    reading = null,
    inline = false,
  }: { facet: string; reading?: ReadingView | null; inline?: boolean } = $props();

  const label = $derived(facet || reading?.text || '—');
  const offLadder = $derived(reading !== null && reading.state !== 'answered');
</script>

{#snippet body()}
  {#if reading}
    <ReadingMark state={reading.state} seal={reading.seal} />
  {/if}
  {#if !inline}
    <span class="min-w-0 flex-1 truncate text-xs text-foreground" title={label}>{label}</span>
  {/if}
  {#if offLadder && reading && (inline || facet)}
    <span class="shrink-0 text-xs text-muted-foreground">{reading.text}</span>
  {/if}
  {#if reading?.evidence}
    <Paperclip
      class="size-3 shrink-0 text-muted-foreground"
      aria-label="Evidence recorded"
      title="Evidence recorded" />
  {/if}
{/snippet}

{#if inline}
  <span class="flex items-center gap-1.5">{@render body()}</span>
{:else}
  <li class="flex items-center gap-2 px-2 py-1">
    {@render body()}
  </li>
{/if}

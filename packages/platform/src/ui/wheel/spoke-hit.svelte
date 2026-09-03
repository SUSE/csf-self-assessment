<script lang="ts">
  import type { Snippet } from 'svelte';
  import { activateOnKey } from './activate';

  // One spoke's hit area and accessible name. `onActivate` absent = a read-only
  // wheel: the group still names itself, it just cannot be reached or pressed.
  type Props = { title: string; onActivate?: (() => void) | undefined; children: Snippet };
  let { title, onActivate, children }: Props = $props();
</script>

{#if onActivate}
  <g
    role="button"
    tabindex="0"
    class="cursor-pointer focus:outline-none"
    aria-label={title}
    onclick={() => onActivate?.()}
    onkeydown={(e) => activateOnKey(e, () => onActivate?.())}
  >
    <title>{title}</title>
    {@render children()}
  </g>
{:else}
  <g>
    <title>{title}</title>
    {@render children()}
  </g>
{/if}

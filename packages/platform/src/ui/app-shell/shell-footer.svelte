<script lang="ts">
  import type { Snippet } from 'svelte';

  // The shell's footer strip: the app's own footer content, or a neutral
  // offline-first default when none is given.
  type Props = {
    /** Footer content; the neutral default is shown when omitted. */
    footer?: Snippet | undefined;
  };
  let { footer }: Props = $props();
</script>

<footer
  class="flex h-10 shrink-0 items-center border-t border-border bg-card px-4 text-xs text-muted-foreground"
>
  {#if footer}
    {@render footer()}
  {:else}
    <span>Cloud Sovereignty Self-Assessment · runs fully offline</span>
  {/if}
</footer>

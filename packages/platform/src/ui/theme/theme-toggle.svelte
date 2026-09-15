<script lang="ts">
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import { Button } from '../button';
  import { theme } from './theme.svelte';

  // A single ghost icon button that flips light/dark. It shows the icon of the
  // theme it will switch *to* (sun while dark, moon while light) — the common
  // affordance. Keyboard-complete: it is a real <button> .
</script>

<Button
  variant="ghost"
  size="icon"
  aria-label={theme.isDark ? 'Switch to light theme' : 'Switch to dark theme'}
  title={theme.isDark ? 'Switch to light theme' : 'Switch to dark theme'}
  onclick={() => theme.toggle()}
>
  {#if theme.isDark}
    <Sun class="size-5" />
  {:else}
    <Moon class="size-5" />
  {/if}
</Button>

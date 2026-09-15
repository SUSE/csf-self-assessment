<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Logo } from '../logo';
  import { ThemeSelector, ThemeToggle } from '../theme';

  // The shell's top chrome: the product logo (left), an optional subtitle, then
  // the app's own header controls and the theme controls (right). The logo carries
  // the product name, so `title` is a short subtitle beside it.
  
  // The two theme controls are the two axes of the token layer — palette (which
  // colours) then mode (light/dark) — and live here rather than per app so both
  // apps stay in step.
  type Props = {
    logoLabel: string;
    /** Short subtitle beside the logo (the logo carries the product name).*/
    title?: string | undefined;
    /** Extra header controls, placed left of the theme controls.*/
    actions?: Snippet | undefined;
  };
  let { logoLabel, title, actions }: Props = $props();
</script>

<header class="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
  <Logo label={logoLabel} />

  {#if title}
    <span class="hidden truncate text-sm text-muted-foreground sm:inline">
      {title}
    </span>
  {/if}

  <div class="flex-1"></div>

  {@render actions?.()}
  <ThemeSelector />
  <ThemeToggle />
</header>

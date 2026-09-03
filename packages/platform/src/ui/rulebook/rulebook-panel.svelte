<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import X from '@lucide/svelte/icons/x';
  import { buttonVariants } from '../button';
  import { SLIDE_MS } from '../motion';
  import { eyebrowVariants } from '../panel';
  import Rulebook from './rulebook.svelte';
  import { getHelp } from './help.svelte';

  // The floating Rulebook: help mode's own panel, lifted off the surface rather
  // than living as a tab in the app shell's right rail (where it competed with the
  // Inspector for the one rail, and every screen had to spend a tab on it).
  //
  // It is the app shell's `overlay` snippet, not a child of the stage: a stage
  // renders inside StageLayout's transformed carousel, and `position` inside a
  // transformed ancestor resolves against that ancestor — a panel mounted there
  // would slide with the stage and clip at its edge. As an overlay it is
  // absolutely positioned against the shell's content ROW, so it spans exactly
  // between header and footer and covers the right rail whether that rail is open
  // or collapsed.
  //
  // Reads the session, so a caller mounts it unconditionally and it shows itself
  // when help mode is on. No session (an app with no help) renders nothing.
  type Props = {
    /** One sentence on how to use help mode here. The default is true everywhere;
     *  a screen whose fields carry `data-rule` markers should say so instead. */
    hint?: string;
  };
  let {
    hint = 'Press a lit header icon to open that section with its rule.',
  }: Props = $props();

  const help = getHelp();

  const flyMs = $derived(prefersReducedMotion.current ? 0 : SLIDE_MS);
</script>

{#if help?.open}
  <!-- `pointer-events-auto` re-arms interaction: the overlay layer the shell
       renders this into is pointer-transparent, so the stage underneath stays
       usable everywhere the panel is not. -->
  <aside
    class="pointer-events-auto absolute inset-y-0 right-0 m-2 flex w-88 max-w-[calc(100%-1rem)] flex-col rounded-lg border border-border bg-card p-3 shadow-lg"
    aria-label="Rulebook"
    transition:fly={{ x: 24, duration: flyMs, easing: cubicOut }}
  >
    <div class="mb-2 flex shrink-0 items-start gap-2">
      <div class="min-w-0 flex-1">
        <h3 class={eyebrowVariants()}>Rulebook</h3>
        <p class="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        aria-label="Close the rulebook"
        onclick={() => help.close()}
      >
        <X class="size-4" />
      </button>
    </div>

    <Rulebook sections={help.sections} activeSection={help.active} />
  </aside>
{/if}

<!-- Escape leaves help mode: the panel is non-modal (nothing behind it is
     blocked), so it needs a dismissal that does not depend on finding the X. -->
<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && help?.open) help.close();
  }}
/>

<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import { buttonVariants } from '../button';
  import * as Popover from '../popover';
  import PaletteOption from './palette-option.svelte';
  import { PALETTES, theme } from './theme.svelte';

  // Palette picker for the app header — the *what colours* axis. Light/dark is
  // the separate ThemeToggle beside it; the two are deliberately not merged into
  // one list of eight, so the mode toggle stays a single-click affordance.
  //
  // An anchored popover, not a modal (a palette switch is a lightweight
  // preference), and a real <button> per option so it is keyboard-complete
  // (invariant #8). Choosing does NOT dismiss: switching palette repaints the
  // whole app behind the popover, and staying open is what lets you flick
  // between palettes and compare.

  let open = $state(false);

  const active = $derived(PALETTES.find((p) => p.id === theme.palette));
</script>

<Popover.Root bind:open>
  <!-- Popover.Trigger renders its own <button>, so it takes the Button recipe as
       classes rather than wrapping a <Button> — the same idiom as question-nav. -->
  <Popover.Trigger
    class={buttonVariants({ variant: 'ghost', size: 'icon' })}
    aria-label="Change colour palette"
    title={active ? `Palette: ${active.label}` : 'Change colour palette'}
  >
    <PaletteIcon class="size-5" />
  </Popover.Trigger>

  <Popover.Content align="end" class="w-64 p-1">
    <div role="menu" aria-label="Colour palette">
      {#each PALETTES as { id, label, note } (id)}
        <PaletteOption
          palette={id}
          {label}
          {note}
          selected={theme.palette === id}
          isDark={theme.isDark}
          onselect={() => theme.setPalette(id)}
        />
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>

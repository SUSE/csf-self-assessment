<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import { cn } from '../../utils/cn';
  import { type Palette } from './theme.svelte';

  // One row of the palette picker. Its swatches are LIVE: the row scopes the
  // palette's own token block onto itself (`theme-<id>`, plus `dark` when the app
  // is in dark mode, because theme.css keys the dark overrides on
  // `.theme-<id>.dark` — both classes must land on the same element). So
  // `bg-primary` inside this row paints THAT palette's primary, not the active
  // one, and the preview stays token-only with no raw colour values.
  
  // This includes the default SUSE palette: it lives on `:root`/`.dark`, which
  // theme.css also aliases as `.theme-suse` / `.theme-suse.dark` precisely so a
  // preview row can name it. Scoping every row the same way is what stops the
  // SUSE row from inheriting — and previewing — the ACTIVE palette's colours.

  let {
    palette,
    label,
    note,
    selected,
    isDark,
    onselect,
  }: {
    palette: Palette;
    label: string;
    note: string;
    selected: boolean;
    /** The app's current mode, so the swatches preview the right variant.*/
    isDark: boolean;
    onselect: () => void;
  } = $props();

  const scope = $derived(cn(`theme-${palette}`, isDark && 'dark'));
</script>

<button
  type="button"
  role="menuitemradio"
  aria-checked={selected}
  class={cn(
    'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
  )}
  onclick={onselect}
>
  <!-- Swatch trio: surface, primary, accent — enough to read a palette at a
     glance. aria-hidden because the label and note already name it. -->
  <span class={cn('flex shrink-0 gap-1', scope)} aria-hidden="true">
    <span class="bg-background border-border size-4 rounded-full border"></span>
    <span class="bg-primary size-4 rounded-full"></span>
    <span class="bg-accent border-border size-4 rounded-full border"></span>
  </span>

  <span class="min-w-0 flex-1">
    <span class="block truncate text-sm leading-tight">{label}</span>
    <span class="text-muted-foreground block truncate text-xs leading-tight">
      {note}
    </span>
  </span>

  <Check class={cn('size-4 shrink-0', !selected && 'invisible')} />
</button>

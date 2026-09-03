// Theme controller — a reactive app-lifetime singleton (Svelte 5 universal
// reactivity). Owns the active theme, applies it as classes on <html> (the
// convention the token layer in theme.css switches on), and persists the choice.
//
// The theme is TWO independent axes, not one list:
//
//   mode    — light | dark. Toggled by the `dark` class.
//   palette — which set of colour/radius/shadow tokens. Toggled by a
//             `theme-<id>` class; the default SUSE palette is the ABSENCE of
//             one, because it lives on `:root`/`.dark` in theme.css.
//
// Keeping them separate is what lets every palette have a dark variant without a
// combinatorial list of names, and lets the existing light/dark toggle keep
// working untouched. Adding a palette means adding a token block in theme.css
// and an entry to PALETTES below — no component changes (spec §3).

export type Mode = 'light' | 'dark';

export type Palette =
  | 'suse'
  | 'pine-mint'
  | 'fog-editorial'
  | 'instrument'
  | 'claymorphism'
  | 'cleanslate'
  | 'modern-minimal'
  | 'supabase';

/** The palette picker's menu, in display order. `id` doubles as the class stem:
 *  every palette but the default applies `theme-<id>` to <html>.
 *
 *  Ordered brand-first, then imported: the four brand pairs are four readings of
 *  the same guide and belong together at the top of the menu, ahead of the
 *  tweakcn presets. A note names what the palette DOES, not which colour it is —
 *  the picker's swatches already show the colour, and The Unnamed Colour Rule
 *  keeps hue names out of anything a reader could mistake for the ramp's meaning. */
export const PALETTES: ReadonlyArray<{
  id: Palette;
  label: string;
  /** One line for the picker — what the palette actually looks like. */
  note: string;
}> = [
  { id: 'suse', label: 'SUSE', note: 'Brand: Jungle on Fog, Pine when dark' },
  { id: 'pine-mint', label: 'Pine & Mint', note: 'Brand: Pine actions, Mint accent' },
  { id: 'fog-editorial', label: 'Fog Editorial', note: 'Brand: printed standard, no shadows' },
  { id: 'instrument', label: 'Instrument', note: 'Brand: dense, tight, Pine rail' },
  { id: 'claymorphism', label: 'Claymorphism', note: 'Soft clay, round, violet' },
  { id: 'cleanslate', label: 'Clean Slate', note: 'Crisp slate, violet' },
  { id: 'modern-minimal', label: 'Modern Minimal', note: 'Restrained blue, tight' },
  { id: 'supabase', label: 'Supabase', note: 'Mint green on neutral grey' },
];

const DEFAULT_PALETTE: Palette = 'suse';

const MODE_KEY = 'csf-theme';
const PALETTE_KEY = 'csf-palette';

// Local persistence only — no network, offline-safe (invariant #7). Both readers
// treat a missing/unparseable value as "not chosen" and fall back.
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // localStorage unavailable (private mode).
  }
}

function initialMode(): Mode {
  const value = stored(MODE_KEY);
  if (value === 'light' || value === 'dark') return value;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

function initialPalette(): Palette {
  const value = stored(PALETTE_KEY);
  // Validate against the union rather than trusting storage — a palette that was
  // retired between visits must not leave a dead class on <html>.
  return PALETTES.some((p) => p.id === value) ? (value as Palette) : DEFAULT_PALETTE;
}

class ThemeController {
  mode = $state<Mode>(initialMode());
  palette = $state<Palette>(initialPalette());

  constructor() {
    // Apply once synchronously so the first paint is already themed (no flash),
    // then let a reactive effect take over. `$effect.root` hosts the effect
    // outside any component so the singleton is self-applying for every
    // consumer; it lives for the app's lifetime (never torn down).
    this.#apply();
    $effect.root(() => {
      $effect(() => this.#apply());
    });
  }

  #apply(): void {
    const { mode, palette } = this;
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    // Remove every palette class before adding the active one, so switching
    // never leaves two token blocks in the cascade.
    for (const { id } of PALETTES) {
      root.classList.toggle(`theme-${id}`, id !== DEFAULT_PALETTE && id === palette);
    }
    this.#persist(MODE_KEY, mode);
    this.#persist(PALETTE_KEY, palette);
  }

  #persist(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Persistence is best-effort; the classes are what actually theme.
    }
  }

  get isDark(): boolean {
    return this.mode === 'dark';
  }

  setMode(mode: Mode): void {
    this.mode = mode;
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
  }

  toggle(): void {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
  }
}

export const theme = new ThemeController();

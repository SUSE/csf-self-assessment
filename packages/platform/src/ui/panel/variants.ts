import { tv, type VariantProps } from 'tailwind-variants';

// The surface vocabulary: four depths, in the order a container can contain
// them.

// canvas the page (bg-background), owned by theme.css's base layer
// └ Panel one section of a screen: a plane lifted off the canvas
// └ Well a compartment cut INTO the panel, holding several cards
// └ Card the object a person reads and acts on
// └ Inset one value inside that card

// Why a vocabulary at all: before this, every level of the Merge review wore the
// identical `rounded-md border border-border` hairline — the panel, the objective
// group inside it, the clash card inside that, and the two candidate boxes inside
// that. Four rings of the same 1px line at four different depths, so containment
// had to be inferred from indentation alone. Elsewhere a `bg-background` row
// inside a `bg-card` panel was invisible in three of the ten mode × palette
// combinations, and a `bg-card` box inside a `bg-card` box in all ten.

// The ramp ALTERNATES rather than stepping monotonically inward, and that is the
// whole design. Four monotone lightness steps would need ~2% deltas to fit inside
// one palette's range, and three of the five palettes do not even distinguish
// `--card` from `--background`. Alternating instead gives every boundary a full
// step to spend and reads as a physical model people already know: a tray sits on
// the desk, a compartment is cut into the tray, cards sit up in the compartment,
// and a slot is cut into a card. The direction changes at every level, so no
// level has to be a subtle shade of its parent.

// The recessed depths use `bg-well` (see theme.css) — derived from `--card`
// toward `--foreground`, which is what makes "recessed" mean darker in light mode
// and lighter in dark mode without a second token or a `dark:` variant anywhere
// in this file.

// HARD RULE: `well` and `inset` are only legal on a `bg-card` surface — inside a
// Panel or a Card. `--well` is derived from `--card`, so a Well dropped straight
// onto the canvas is a step away from the wrong parent and lands wherever the
// palette happens to put it. A quiet region directly on the canvas is
// `Panel tone="quiet"`, which uses `--muted` — the one token that is distinct
// from `--background` in all ten combinations.

// The only hue in this file is `--warning`, on the open card, and it carries the
// meaning it carries everywhere else in the product: act here.

// Every surface string lives in a compoundVariant rather than on the `depth` and
// `tone` variants themselves, so exactly ONE background and ONE border ever reach
// the output. tailwind-merge would in fact collapse `bg-card bg-well` correctly
// (verified — it groups both under background-color), but relying on that would
// make the emitted class list depend on the order the variant keys happen to be
// declared in. Resolving here means the variant output is already minimal, and a
// caller's `class` is the only thing that can change a surface's colour — which
// is exactly the one override that should be visible at the call site.
export const surfaceVariants = tv({
  variants: {
    // Radius is fixed per depth. The concentric ladder — a smaller radius for
    // every level inward — is the point, not a knob.
    depth: {
      panel: 'rounded-lg',
      well: 'rounded-lg',
      card: 'rounded-md',
      inset: 'rounded-sm',
    },
    // Surface strings come from the compounds below; `tone` itself contributes
    // nothing on its own.
    tone: { default: '', quiet: '', empty: '' },
    // `card` only. The one accent in the vocabulary.
    state: { none: '', open: '', settled: '' },
    density: {
      none: '',
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      // The widest padding also opens the radius, so the concentric rule still
      // holds for the two big answering cards.
      xl: 'rounded-xl p-6',
    },
  },
  compoundVariants: [
    // A plane on the canvas — border, surface and a hairline lift, so a screen
    // reads as a set of planes rather than a stack of outlines. The lift is what
    // keeps a panel legible under the three palettes where `--card` and
    // `--background` are the same colour.
    { depth: 'panel', tone: 'default', class: 'border border-border bg-card shadow-xs' },

    // A compartment cut into a panel, holding cards. Recessed and unlit: nothing
    // inside it should have to compete with its own container for attention, so
    // it takes a softened edge and no shadow of its own.
    { depth: 'well', tone: 'default', class: 'border border-border/60 bg-well' },

    // The object a person reads and acts on. Sits UP out of a well, back at the
    // panel's own surface, with the lift the well refused.
    { depth: 'card', tone: 'default', state: 'none', class: 'border border-border bg-card shadow-xs' },
    // Still waiting on a human. The perimeter — not a rail; a coloured border-left
    // above 1px is a house-style refusal — carries `--warning`. Never the only
    // carrier: every site pairs it with a word.
    { depth: 'card', tone: 'default', state: 'open', class: 'border border-warning/45 bg-card shadow-xs' },
    // Work done. Same surface, because a settled decision must stay just as
    // legible and just as changeable; the lift is what drops, so a finished queue
    // visibly flattens as it is worked down.
    { depth: 'card', tone: 'default', state: 'settled', class: 'border border-border bg-card' },

    // One value inside a card: a candidate answer, a before/after reading, a
    // disclosure. Fill only, NO border — this is the depth where another ring of
    // hairline turns a card into a grid of boxes.
    { depth: 'inset', tone: 'default', class: 'bg-well' },

    // A region that is present but not the subject: a front sheet behind the
    // work, a commit strip under it. `--muted` rather than `--well` because a
    // quiet region is usually laid straight on the canvas, where a card-derived
    // step has no parent to step away from.
    { tone: 'quiet', class: 'border border-border bg-muted' },
    // Nothing here yet. Unfilled and dashed: an empty state should read as an
    // outline waiting to be filled, not as a surface that happens to be blank.
    { tone: 'empty', class: 'border border-dashed border-border' },
  ],
  defaultVariants: {
    depth: 'panel',
    tone: 'default',
    state: 'none',
    density: 'md',
  },
});

export type SurfaceDepth = VariantProps<typeof surfaceVariants>['depth'];
export type SurfaceTone = VariantProps<typeof surfaceVariants>['tone'];
export type SurfaceState = VariantProps<typeof surfaceVariants>['state'];
export type SurfaceDensity = VariantProps<typeof surfaceVariants>['density'];

// The title line of a panel, in the two registers the product already speaks.
// Both are preserved as-is: the author side's all-caps eyebrow predates the SUSE
// guide's rule against all-caps headlines, and reconciling that is a brand
// decision that must not ride along on a surface refactor.
export const headerVariants = tv({
  base: 'text-sm',
  variants: {
    tone: {
      eyebrow: 'font-semibold uppercase tracking-wide text-muted-foreground',
      plain: 'font-medium text-foreground',
    },
  },
  defaultVariants: { tone: 'plain' },
});

export type PanelHeaderTone = VariantProps<typeof headerVariants>['tone'];

// The column label INSIDE a panel — one step below a PanelHeader eyebrow, and
// the label over a candidate column, a lane or a detail group. Both weights exist
// in the wild and both are kept.
export const eyebrowVariants = tv({
  base: 'text-xs uppercase tracking-wide text-muted-foreground',
  variants: {
    weight: {
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
  },
  defaultVariants: { weight: 'semibold' },
});

export type EyebrowWeight = VariantProps<typeof eyebrowVariants>['weight'];

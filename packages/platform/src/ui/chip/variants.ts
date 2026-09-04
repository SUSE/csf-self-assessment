import { tv, type VariantProps } from 'tailwind-variants';

// The pill. One primitive for the ~8 places that hand-tuned their own: the clash
// class and the answering role on a clash card, open/decided on the two merge
// queues, the three-tone authority badge on a candidate, the critical flag in the
// question inspector, the claim status badge.

// Every tone declares a border — transparent where the design has none — so a row
// of mixed tones has one height and one baseline. The only hue here is the one
// each tone already carried: `--warning` for "act here" and `--positive` for
// "done", both read from the palette in scope.
export const chipVariants = tv({
  base: 'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
  variants: {
    tone: {
      // Outline, quiet ink. Metadata that names the thing without competing
      // with the title beside it.
      neutral: 'border-border text-muted-foreground',
      // Outline, full ink. The one of a graded set that is authoritative.
      strong: 'border-foreground/40 font-medium text-foreground',
      // Filled and quiet. A settled state: present, done, not asking.
      muted: 'border-border bg-muted text-muted-foreground',
      // Filled and quiet, for an identifier rather than a word — a role key, a
      // short code — where the monospace is what makes it read as a token.
      mono: 'border-transparent bg-muted font-mono text-muted-foreground',
      // Act here. The product's one amber, always paired with a word.
      attention: 'border-warning/40 bg-warning/10 font-medium text-warning-ink',
      // Done, in the affirmative sense — a claim fully answered.
      positive: 'border-positive/30 bg-positive/15 font-medium text-positive',
      // Broken: this blocks something downstream until it is fixed. The
      // product's one red, inherited unchanged by every palette so a
      // validation failure never fades into a theme.
      danger: 'border-destructive/40 bg-destructive/15 font-medium text-destructive-ink',
    },
    size: {
      default: '',
      // For a chip sitting inside an Inset or a dense list row, where the
      // default pill crowds the line it annotates. Narrower, not smaller — the
      // dense-mark steps are for annotations, and a chip is a word.
      sm: 'px-1.5 py-0.5',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'default' },
});

export type ChipTone = VariantProps<typeof chipVariants>['tone'];
export type ChipSize = VariantProps<typeof chipVariants>['size'];

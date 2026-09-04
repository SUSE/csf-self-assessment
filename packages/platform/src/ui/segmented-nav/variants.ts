import { tv } from 'tailwind-variants';

// The segmented strip: a bordered rail of small buttons where exactly one reads as
// current. Three hand-tuned copies of this existed in the Author shell alone (the
// mode switch, the right-rail tabs, the QA estate picker), each restating the same
// six utilities, so the encoding lives here once.

export const segmentedStripVariants = tv({
  base: 'gap-1 rounded-md border border-border p-0.5',
  variants: {
    // Segments share the strip's width — for a strip that fills its column.
    grow: {
      // `shrink-0` because a filling strip sits in a flex COLUMN, where it would
      // otherwise be squeezed by the scrolling pane beneath it.
      true: 'flex shrink-0',
      false: 'inline-flex',
    },
  },
  defaultVariants: { grow: false },
});

export const segmentedItemVariants = tv({
  // `bg-accent` is the one fill that reads as a state under every palette: the
  // `muted`/`input` surfaces sit within ~0.03 L of the card under the imported
  // dark palettes, which is a *nothing* state.
  base: 'rounded px-2 py-1 text-xs disabled:opacity-40',
  variants: {
    active: {
      true: 'bg-accent font-medium text-foreground',
      false: 'text-muted-foreground hover:text-foreground',
    },
    grow: {
      true: 'flex-1',
      false: '',
    },
  },
  defaultVariants: { active: false, grow: false },
});

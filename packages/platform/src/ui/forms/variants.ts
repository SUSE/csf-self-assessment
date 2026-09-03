import { tv, type VariantProps } from 'tailwind-variants';

// Shared styling for the form input primitives, in design tokens. Two knobs:
//   density — `default` for standalone forms, `compact` to sit in a card row
//             next to DetailFields (matches their tighter rhythm).
//   invalid — swaps the neutral border/ring for the destructive ones, so an
//             errored field reads red on its outline and on focus.
// Disabled and read-only inert styling is owned globally by theme.css (unlayered
// rules), so it is deliberately NOT a variant here — never add `disabled:` /
// read-only utilities to a control, they would be overridden anyway.
export const inputVariants = tv({
  base: 'block w-full rounded-md border bg-background text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1',
  variants: {
    density: {
      default: 'px-3 py-2 text-sm',
      compact: 'px-2 py-1 text-sm',
    },
    invalid: {
      true: 'border-destructive focus-visible:ring-destructive',
      false: 'border-input focus-visible:ring-ring',
    },
  },
  defaultVariants: {
    density: 'default',
    invalid: false,
  },
});

export type InputDensity = VariantProps<typeof inputVariants>['density'];

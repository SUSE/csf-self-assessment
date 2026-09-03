import type { HTMLAttributes } from 'svelte/elements';
import type { WithElementRef } from '../../utils/cn';

// A surface is polymorphic — `as` chooses the element — so its attribute type has
// to be the loose one. `HTMLAttributes<HTMLElement>` covers the global attributes
// (every `data-*`, `aria-*`, `tabindex`, event handler) that any element takes,
// which is what lets a migrated site keep its existing probe hooks untouched.
//
// Element-specific attributes are named here one at a time rather than by opening
// the type to `any`: an `as="details"` surface is the only shape in the repo that
// needs one, and spelling it out keeps a typo in the common case an error.
export type SurfaceAttributes = WithElementRef<HTMLAttributes<HTMLElement>> & {
  /** `<details>` only: whether the disclosure starts open. */
  open?: boolean;
  /** `<button>` only: never let an `as="button"` surface default to submit. */
  type?: 'button' | 'submit' | 'reset';
};

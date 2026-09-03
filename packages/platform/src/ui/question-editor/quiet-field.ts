// The quiet-until-asked prose field, shared by the three fields on the question
// card that hold words the room will read: the question, the why line, and each
// rung's description.
//
// At rest a field has no border and no fill, so the card reads as the question it
// authors rather than as a form about a question (DESIGN.md, the Quiet-Until-Asked
// Rule: at this density every element that asserts itself at rest is one the
// reader has to dismiss). The control surfaces itself on hover and on focus.
//
// `border-transparent` rather than `border-none` is the Reserved Border Rule:
// every element that will EVER show a border carries one at rest, so waking a
// field RECOLOURS a border that is already there instead of adding one — nothing
// reflows by a pixel.
//
// Composed over `inputVariants` via `cn` at each call site, so the form primitive
// still owns the radius, the focus ring, the invalid state and theme.css's global
// disabled/read-only rules. `field-sizing-content` lets a long question grow
// instead of scrolling inside two rows; the `rows` attribute stays the floor (and
// the fallback where the browser has no support for it).
// `resize-none` replaces the primitive's `resize-y` deliberately: with the field
// sized from its content there is nothing left for a drag to do, and a grabber in
// every corner is six marks the resting card has to carry for nothing.
export const QUIET_FIELD =
  'field-sizing-content resize-none border-transparent bg-transparent px-2 py-1.5 hover:border-border hover:bg-background focus-visible:border-border focus-visible:bg-background';

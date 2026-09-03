// The vendor plane's five slots, as literal utility strings — Tailwind extracts
// class names by scanning source text, so `bg-vendor-${n}` would compile to
// nothing (the `sealSwatchClass` rule).
export type VendorAccent = {
  /** Solid fill: stripes, rules, numerals set as marks. */
  bar: string;
  /** The same hue on the text plane. */
  ink: string;
  /** The surface a card of that hue sits on. */
  wash: string;
  /** Border in the hue, for an edge that must read as the card's colour. */
  edge: string;
};

const ACCENTS: readonly VendorAccent[] = [
  { bar: 'bg-vendor-1', ink: 'text-vendor-ink-1', wash: 'bg-vendor-wash-1', edge: 'border-vendor-1' },
  { bar: 'bg-vendor-2', ink: 'text-vendor-ink-2', wash: 'bg-vendor-wash-2', edge: 'border-vendor-2' },
  { bar: 'bg-vendor-3', ink: 'text-vendor-ink-3', wash: 'bg-vendor-wash-3', edge: 'border-vendor-3' },
  { bar: 'bg-vendor-4', ink: 'text-vendor-ink-4', wash: 'bg-vendor-wash-4', edge: 'border-vendor-4' },
  { bar: 'bg-vendor-5', ink: 'text-vendor-ink-5', wash: 'bg-vendor-wash-5', edge: 'border-vendor-5' },
];

export const VENDOR_ACCENTS = ACCENTS;

export function vendorAccent(index: number): VendorAccent {
  return ACCENTS[((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length]!;
}

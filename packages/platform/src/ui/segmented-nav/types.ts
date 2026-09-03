// One segment of a segmented strip. The type lives in a plain module, not in the
// component's `<script module>`: the ambient `*.svelte` module exposes only
// `default`, so a type declared there cannot be re-exported through the barrel.
export type SegmentedItem = {
  /** The value the host holds as its active segment. */
  id: string;
  label: string;
  /** Nothing to go to yet. Always paired with a `title` saying why. */
  disabled?: boolean;
  /** What pressing this does, or why it cannot be pressed. */
  title?: string;
  /** Probe hooks the host wants on the button — `{ 'data-estate': id }`. */
  data?: Record<string, string>;
};

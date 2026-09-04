// A record table's column spec. It lives in a plain `.ts` sibling, not in the
// component's `<script module>`, because a type declared there cannot be
// re-exported through this folder's barrel (the ambient `*.svelte` module exposes
// only `default`) — the same reason `fanout-card` keeps its input type here.
export type RecordColumn = {
  label: string;
  // A width utility. A share (`w-[16%]`) for text that should grow with the
  // panel; a fixed `w-*` for a column holding a control, which never widens.
  // Leave it off on the ONE column that should absorb the remainder.
  width?: string;
  align?: 'left' | 'center' | 'right';
};

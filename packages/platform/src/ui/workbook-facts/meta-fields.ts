import type { WorkbookMeta } from '../../schema';

// The workbook's identity strip, as data. The three fields are the same control
// with three widths, so they are declared once and rendered in a loop rather than
// written out three times. BOTH faces read this one list — the author's editable
// MetaField and the read-only WorkbookMetaFacts — so id, version and title carry
// the same face and the same widths whichever app shows them; `commit` is the one
// field only the editable face uses.
export type MetaFieldSpec = {
  /** The meta key this field edits — also its caption. */
  label: 'id' | 'version' | 'title';
  /** Monospace face: ids and versions are codes, a title is prose. */
  mono: boolean;
  /** `change` commits on blur/Enter — right for an identity field a half-typed
   *  value of which would be a different workbook. `input` commits per keystroke,
   *  which is what a title wants (design rule 2). */
  commit: 'input' | 'change';
  /** Takes the row's slack. */
  grow: boolean;
  /** Flex sizing for the field inside DetailsCard's wrapping row. Codes get a
   *  basis just wide enough for their content; the title grows into the rest but
   *  stops at a readable measure — an input stretched to 1800px is a text field
   *  whose end the eye cannot find from its start. */
  fieldClass: string;
};

export const META_FIELDS: MetaFieldSpec[] = [
  { label: 'id', mono: true, commit: 'change', grow: false, fieldClass: 'w-44 shrink-0' },
  { label: 'version', mono: true, commit: 'change', grow: false, fieldClass: 'w-28 shrink-0' },
  {
    label: 'title',
    mono: false,
    commit: 'input',
    grow: true,
    fieldClass: 'min-w-0 basis-[22rem] max-w-2xl',
  },
];

export function metaValue(meta: WorkbookMeta, label: MetaFieldSpec['label']): string {
  return meta[label];
}

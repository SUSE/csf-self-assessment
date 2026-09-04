import type { ReportTag } from '../../report';

// The tag plane's three slots, as literal utility strings — Tailwind extracts
// class names by scanning source text, so `bg-tag-wash-${n}` would compile to
// nothing (the `sealSwatchClass` rule).

// One slot per seal-less family, assigned here and not by index: a family's
// colour is part of how the reader recognises a badge across twenty pages, so it
// must not move when another family is added.
const SLOTS: Readonly<Record<string, string>> = {
  evidence: 'border-tag-1 bg-tag-wash-1 text-tag-ink-1',
  'dont-know': 'border-tag-2 bg-tag-wash-2 text-tag-ink-2',
  'second-look': 'border-tag-3 bg-tag-wash-3 text-tag-ink-3',
};

// The badge skin for a tag with no seal to wear.
export function tagAccent(tag: ReportTag): string {
  return SLOTS[tag.family] ?? 'border-border bg-muted text-foreground';
}

import type { ReportCover } from './document';

// The `document.title` swapped in immediately before `window.print()`: Chrome,
// Safari and Firefox all seed the Save-as-PDF filename from it (§4.3). No
// extension — the browser adds `.pdf`.
export function reportFilename(cover: ReportCover): string {
  const slug = cover.estateName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `csf-report-${slug === '' ? 'estate' : slug}-${cover.generatedOn}`;
}

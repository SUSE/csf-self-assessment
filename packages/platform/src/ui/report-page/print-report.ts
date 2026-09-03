// Prints the Report. Swaps `document.title` so the browser seeds the
// Save-as-PDF filename from it, and drops the `dark` class so the document
// prints light in the ACTIVE palette (§4.3, — never a fifth
// palette). Both are restored when the print dialog returns.
export function printReport(filename: string): void {
  const root = document.documentElement;
  const title = document.title;
  const wasDark = root.classList.contains('dark');
  document.title = filename;
  // The theme controller re-applies its classes only when `mode` changes, so
  // removing `dark` here does not fight it (ui/theme/theme.svelte.ts).
  root.classList.remove('dark');
  try {
    window.print();
  } finally {
    document.title = title;
    if (wasDark) root.classList.add('dark');
  }
}

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One source file the scan reads. `path` is repo-relative and is what a
 *  failure message prints — the scan spans three roots, so a path relative to
 *  any one of them would be ambiguous. */
export type ScannedFile = {
  readonly path: string;
  readonly text: string;
};

/** Which scanned files an entry applies to (spec §2.1, field `scope`).
 *  `everywhere` is the default the spec names; both `paths` variants test the
 *  repo-relative path, and `except` wins over `match`. */
export type EntryScope =
  | { readonly kind: 'everywhere' }
  | { readonly kind: 'paths'; readonly match: RegExp }
  | { readonly kind: 'paths-except'; readonly match: RegExp; readonly except: RegExp };

/** The fields every entry declares regardless of rule kind (spec §2.1). */
type EntryCommon = {
  readonly what: string;
  readonly instead: string;
  readonly scope: EntryScope;
};

/** One banned thing (spec §2.1). A `line` entry bans a pattern on a line and
 *  may pardon one; a `size` entry bans a file longer than `maxLines`
 *  (§6 invariant 6). `instead` is required of both by invariant 5. */
export type ScanEntry =
  | (EntryCommon & {
      readonly kind: 'line';
      readonly pattern: RegExp;
      readonly exempt: RegExp | null;
    })
  | (EntryCommon & { readonly kind: 'size'; readonly maxLines: number });

export type LineEntry = Extract<ScanEntry, { kind: 'line' }>;

/** The repo-relative roots the scan walks (spec §2.1). */
export const SCAN_ROOTS: readonly string[] = [
  'packages/platform/src',
  'apps/author/src',
  'apps/assessment/src',
];

/** Directory names the walk never enters. */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['fonts', 'node_modules']);

/** Repo-relative paths the scan never reads: they hold the patterns
 *  themselves, so scanning them would report the guard as its own offender. */
export const SCAN_SELF: readonly string[] = [
  'packages/platform/src/ui/theme/tokens.test.ts',
  'packages/platform/src/ui/theme/source-scan.ts',
  'packages/platform/src/ui/theme/source-scan.test.ts',
];

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

function repoRelative(absolute: string): string {
  return relative(REPO_ROOT, absolute).split(sep).join('/');
}

function walk(dir: string, out: ScannedFile[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path, out);
    } else if (/\.(svelte|ts)$/.test(name)) {
      const rel = repoRelative(path);
      if (!SCAN_SELF.includes(rel)) out.push({ path: rel, text: readFileSync(path, 'utf8') });
    }
  }
}

/** Every `.svelte`/`.ts` file under `roots`, minus `SKIP_DIRS` and
 *  `SCAN_SELF`, depth-first. Reads the working tree — test-only, never
 *  imported by runtime or app code and never barrel-exported. */
export function scannedFiles(roots: readonly string[]): ScannedFile[] {
  const out: ScannedFile[] = [];
  for (const root of roots) walk(join(REPO_ROOT, root), out);
  return out;
}

/** True when `entry` applies to a repo-relative `path`. */
export function appliesTo(entry: ScanEntry, path: string): boolean {
  const scope = entry.scope;
  switch (scope.kind) {
    case 'everywhere':
      return true;
    case 'paths':
      return scope.match.test(path);
    case 'paths-except':
      return scope.match.test(path) && !scope.except.test(path);
  }
}

/** Lines the way `wc -l` counts them: a trailing newline ends the last line,
 *  it does not start a new one. */
export function lineCount(text: string): number {
  if (text === '') return 0;
  const lines = text.split('\n');
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

/** Every hit for `entry`, formatted `<path>:<line>: <what was found>`. A `line`
 *  entry reports at most one hit per line — the first — because the report
 *  exists to point a developer at a line, not to count occurrences on it. A
 *  `size` entry reports the first line past the cap, so the report is still a
 *  place a developer can jump to. */
export function offenders(files: readonly ScannedFile[], entry: ScanEntry): string[] {
  const out: string[] = [];
  for (const file of files) {
    if (!appliesTo(entry, file.path)) continue;
    switch (entry.kind) {
      case 'line':
        file.text.split('\n').forEach((line, i) => {
          if (entry.exempt?.test(line)) return;
          const hit = line.match(entry.pattern);
          if (hit) out.push(`${file.path}:${i + 1}: ${hit[0]}`);
        });
        break;
      case 'size': {
        const count = lineCount(file.text);
        if (count > entry.maxLines) out.push(`${file.path}:${entry.maxLines + 1}: ${count} lines`);
        break;
      }
    }
  }
  return out;
}

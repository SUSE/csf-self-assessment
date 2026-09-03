import { describe, expect, it } from 'vitest';

import {
  appliesTo,
  lineCount,
  offenders,
  SCAN_ROOTS,
  scannedFiles,
  type ScanEntry,
  type EntryScope,
} from './source-scan';

function entry(scope: EntryScope, pattern = /<input(?=\s|$)/, exempt: RegExp | null = null): ScanEntry {
  return { kind: 'line', what: 'a thing', pattern, exempt, instead: 'something else', scope };
}

const RAW_FORM = /<(?:input|select|textarea)(?=\s|$)/;
const RAW_FORM_SCOPE: EntryScope = {
  kind: 'paths-except',
  match: /\.svelte$/,
  except: /ui\/forms\// ,
};

describe('the file list', () => {
  it('resolves every root to a directory that yields files', () => {
    for (const root of SCAN_ROOTS) {
      expect(scannedFiles([root]).length, root).toBeGreaterThan(0);
    }
    expect(scannedFiles(SCAN_ROOTS).length).toBeGreaterThan(100);
  });

  it('yields only repo-relative .svelte and .ts source', () => {
    const paths = scannedFiles(SCAN_ROOTS).map((f) => f.path);
    for (const path of paths) {
      expect(path, path).toMatch(/\.(svelte|ts)$/);
      expect(path.startsWith('/'), path).toBe(false);
    }
    expect(paths.filter((p) => p.includes('node_modules'))).toEqual([]);
    expect(paths).toContain('packages/platform/src/ui/forms/input.svelte');
  });

  it('never reads its own table', () => {
    const paths = scannedFiles(SCAN_ROOTS).map((f) => f.path);
    expect(paths).not.toContain('packages/platform/src/ui/theme/tokens.test.ts');
    expect(paths).not.toContain('packages/platform/src/ui/theme/source-scan.ts');
    expect(paths).not.toContain('packages/platform/src/ui/theme/source-scan.test.ts');
  });
});

describe('scope', () => {
  it('everywhere applies to any path', () => {
    expect(appliesTo(entry({ kind: 'everywhere' }), 'apps/author/src/main.ts')).toBe(true);
  });

  it('paths applies only where the match hits', () => {
    const e = entry({ kind: 'paths', match: /\.svelte$/ });
    expect(appliesTo(e, 'a/b.svelte')).toBe(true);
    expect(appliesTo(e, 'a/b.ts')).toBe(false);
  });

  it('paths-except lets except win over match', () => {
    const e = entry(RAW_FORM_SCOPE);
    expect(appliesTo(e, 'packages/platform/src/ui/forms/input.svelte')).toBe(false);
    expect(appliesTo(e, 'packages/platform/src/ui/workbench/objective-editor.svelte')).toBe(true);
    expect(appliesTo(e, 'packages/platform/src/ui/forms/notes.ts')).toBe(false);
  });
});

describe('offenders', () => {
  it('reports path, 1-based line and the matched text, in scope only', () => {
    const files = [
      { path: 'a.svelte', text: 'ok\n<input\nmore' },
      { path: 'packages/platform/src/ui/forms/b.svelte', text: '<input' },
      { path: 'c.ts', text: '<input' },
    ];
    expect(offenders(files, entry(RAW_FORM_SCOPE, RAW_FORM))).toEqual(['a.svelte:2: <input']);
  });

  it('pardons an exempt line', () => {
    const files = [
      { path: 'x.svelte', text: 'oklch(from var(--primary) l c h)\noklch(0.7 0.1 80)' },
    ];
    const e = entry({ kind: 'everywhere' }, /\boklch\(/, /var\(--/);
    expect(offenders(files, e)).toEqual(['x.svelte:2: oklch(']);
  });

  it('reports one hit per line, not one per occurrence', () => {
    const files = [{ path: 'a.svelte', text: '<input <input' }];
    expect(offenders(files, entry(RAW_FORM_SCOPE, RAW_FORM))).toHaveLength(1);
  });
});

describe('lineCount', () => {
  it('counts an empty file as no lines', () => {
    expect(lineCount('')).toBe(0);
  });

  it('counts a single unterminated line', () => {
    expect(lineCount('a')).toBe(1);
  });

  it('treats a trailing newline as the end of the last line', () => {
    expect(lineCount('a\n')).toBe(1);
  });

  it('counts two terminated lines', () => {
    expect(lineCount('a\nb\n')).toBe(2);
  });
});

describe('offenders — a size rule', () => {
  const cap: ScanEntry = {
    kind: 'size',
    what: 'a long file',
    maxLines: 500,
    instead: 'split it',
    scope: { kind: 'paths-except', match: /\.(svelte|ts)$/, except: /\.test\.ts$/ },
  };

  it('reports the first line past the cap and the count', () => {
    expect(offenders([{ path: 'a.ts', text: 'x\n'.repeat(501) }], cap)).toEqual([
      'a.ts:501: 501 lines',
    ]);
  });

  it('leaves a file exactly at the cap alone', () => {
    expect(offenders([{ path: 'a.ts', text: 'x\n'.repeat(500) }], cap)).toEqual([]);
  });

  it('counts a last line with no trailing newline', () => {
    expect(offenders([{ path: 'a.ts', text: 'x\n'.repeat(500) + 'y' }], cap)).toEqual([
      'a.ts:501: 501 lines',
    ]);
  });

  it('honours the scope', () => {
    expect(offenders([{ path: 'a.test.ts', text: 'x\n'.repeat(600) }], cap)).toEqual([]);
  });
});

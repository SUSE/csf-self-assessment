import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, readlink, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

import {
  GENERATOR_VERSION,
  MANAGED_TRANSFORMS,
  REPOSITORY_PRESETS,
  RUNTIME_FILES,
  ensureTweakcnRuntime,
  generateRepositoryPresetSource,
  requireTweakcnRuntime,
  patchManagedSource,
  patchUpstreamNextConfig,
  patchUpstreamPresetSource,
} from './tweakcn-runtime.mjs';
import {
  UPSTREAM_NEXT_CONFIG,
  UPSTREAM_PRESETS,
  UPSTREAM_SHELL_FILES,
} from './tweakcn-test-project.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const THEME = join(ROOT, 'packages/platform/src/ui/theme.css');
const themeCss = await readFile(THEME, 'utf8');
const upstreamPresets = UPSTREAM_PRESETS;
const upstreamNextConfig = UPSTREAM_NEXT_CONFIG;

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'tweakcn-runtime-test-'));
  const checkout = join(root, 'checkout');
  const runtime = join(root, 'runtime');
  execFileSync('git', ['init', '-q', checkout]);
  git(checkout, 'config', 'user.email', 'test@example.invalid');
  git(checkout, 'config', 'user.name', 'Test');
  await mkdir(join(checkout, 'utils'), { recursive: true });
  await writeFile(join(checkout, '.gitignore'), 'node_modules/\n.next/\n');
  await writeFile(join(checkout, 'utils/theme-presets.ts'), upstreamPresets);
  await writeFile(join(checkout, 'next.config.ts'), upstreamNextConfig);
  for (const [path, source] of Object.entries(UPSTREAM_SHELL_FILES)) {
    await mkdir(join(checkout, path, '..'), { recursive: true });
    await writeFile(join(checkout, path), source);
  }
  await writeFile(join(checkout, 'committed.txt'), 'committed\n');
  await writeFile(join(checkout, 'package.json'), '{"scripts":{"dev":"next dev"}}\n');
  await writeFile(join(checkout, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  git(checkout, 'add', '.');
  git(checkout, 'commit', '-qm', 'fixture');
  const commit = git(checkout, 'rev-parse', 'HEAD');
  git(checkout, 'checkout', '-q', '--detach', commit);
  await mkdir(join(checkout, 'node_modules/.bin'), { recursive: true });
  await writeFile(join(checkout, 'node_modules/.bin/next'), '#!/bin/sh\n');
  await chmod(join(checkout, 'node_modules/.bin/next'), 0o755);
  await writeFile(join(checkout, 'untracked-secret'), 'never copy\n');
  await writeFile(join(checkout, '.git/info/exclude'), 'untracked-secret\n');
  return { root, checkout, runtime, commit, config: { checkout, runtime, commit } };
}

test('preset generator emits exactly eight stable built-in CSF presets from authoritative values', () => {
  const source = generateRepositoryPresetSource(themeCss);
  assert.equal(source, generateRepositoryPresetSource(themeCss));
  for (const { presetId, label } of REPOSITORY_PRESETS) {
    assert.match(source, new RegExp(`"${presetId}"`));
    assert.match(source, new RegExp(`"label": "${label}"`));
  }
  assert.equal((source.match(/"source": "BUILT_IN"/g) ?? []).length, 8);
  assert.match(source, /"primary": "oklch\(/);
  assert.match(source, /"radius":/);
  assert.match(source, /"shadow-offset-y":/);
  assert.doesNotMatch(source, /font-sans|seal-hue|shadow-sm|--well/);
});

test('upstream patch uses exact anchors, preserves modern-minimal, and rejects drift or collisions', () => {
  const patched = patchUpstreamPresetSource(upstreamPresets);
  assert.match(patched, /csfRepositoryPresets/);
  assert.match(patched, /\.\.\.csfRepositoryPresets/);
  assert.match(patched, /"modern-minimal"/);
  assert.throws(() => patchUpstreamPresetSource(upstreamPresets.replace('export const', 'export let')), /anchor/i);
  assert.throws(
    () => patchUpstreamPresetSource(upstreamPresets.replace('"modern-minimal"', '"csf-suse"')),
    /collision/i,
  );

  const nextConfig = patchUpstreamNextConfig(upstreamNextConfig);
  assert.match(nextConfig, /import \{ resolve \} from "node:path"/);
  assert.match(nextConfig, /root: resolve\(process\.cwd\(\), "\.\."\)/);
  assert.throws(
    () => patchUpstreamNextConfig(upstreamNextConfig.replace('  turbopack: {', '  turbo: {')),
    /anchor/i,
  );
});

test('managed shell transforms remove cloud features while preserving local editor seams', () => {
  const expectations = {
    'app/page.tsx': {
      keeps: ['Header', 'Editor', 'Promise.resolve(null)', 'h-svh', 'Local Theme Editor'],
      removes: ['AIGenerationCTA', 'Hero', 'Footer', 'getTheme', 'themeId', 'params', 'redirect'],
    },
    'components/header.tsx': {
      keeps: ['Local controls'],
      removes: ['GetProCTA', 'UserProfileDropdown'],
    },
    'app/layout.tsx': {
      keeps: ['DynamicFontLoader', '{children}'],
      removes: ['AuthDialogWrapper', 'GetProDialogWrapper'],
    },
    'hooks/use-dialog-actions.tsx': {
      keeps: ['CssImportDialog', 'CodePanelDialog', 'handleCssImport', 'setCodePanelOpen'],
      removes: ['authClient', 'useCreateTheme', 'usePostLoginAction', 'ShareDialog', 'ThemeSaveDialog'],
    },
    'components/editor/action-bar/action-bar.tsx': {
      keeps: ['setCssImportOpen', 'setCodePanelOpen', 'onExportClick'],
      removes: ['handleSaveClick', 'handleShareClick', 'isCreatingTheme', 'onCodeClick'],
    },
    'components/editor/action-bar/components/action-bar-buttons.tsx': {
      keeps: ['ImportButton', 'Button', 'Download', 'Export CSS', 'onExportClick'],
      removes: ['CodeButton', 'onCodeClick', 'SaveButton', 'ShareButton', 'PublishButton', 'useAIThemeGenerationCore'],
    },
    'components/editor/code-panel.tsx': {
      keeps: ['Theme Code', 'index.css', 'Copy to clipboard', 'Tailwind v4'],
      removes: ['useDialogActions', 'useThemePresetStore', 'getRegistryCommand', 'Save'],
    },
    'components/editor/theme-preset-select.tsx': {
      keeps: ['Built-in Themes', 'applyThemePreset', 'hasUnsavedChanges'],
      removes: ['authClient', 'loadSavedPresets', 'Saved Themes', 'Manage', '/community'],
    },
    'components/editor/theme-control-panel.tsx': {
      keeps: ['Colors', 'Typography', 'Other'],
      removes: ['ChatInterface', 'useAIThemeGenerationCore', 'Generate', 'value="ai"'],
    },
    'components/editor/theme-preview-panel.tsx': {
      keeps: ['Inspector', 'ThemeToggle', 'toggleFullscreen'],
      removes: ['useDialogActions', 'handleOpenInV0', 'V0Logo', 'Open in'],
    },
  };

  assert.deepEqual(Object.keys(MANAGED_TRANSFORMS), Object.keys(expectations));
  for (const [path, { keeps, removes }] of Object.entries(expectations)) {
    const patched = patchManagedSource(path, UPSTREAM_SHELL_FILES[path]);
    for (const text of keeps) assert.match(patched, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const text of removes) assert.doesNotMatch(patched, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('managed shell transforms reject drift and duplicate or colliding patch state', () => {
  for (const [path, source] of Object.entries(UPSTREAM_SHELL_FILES)) {
    const transform = MANAGED_TRANSFORMS[path];
    assert.throws(
      () => patchManagedSource(path, source.replace(transform.anchor, 'changed upstream anchor')),
      /anchor/i,
      path,
    );
    assert.throws(() => patchManagedSource(path, patchManagedSource(path, source)), /anchor|collision|patched/i, path);
  }
});

test('materializer extracts committed files, links dependencies, marks ownership, and reuses deterministically', async () => {
  const f = await fixture();
  const first = await ensureTweakcnRuntime({ config: f.config, themeCss });
  assert.equal(first.reused, false);
  assert.equal(await readFile(join(f.runtime, 'committed.txt'), 'utf8'), 'committed\n');
  await assert.rejects(readFile(join(f.runtime, 'untracked-secret'), 'utf8'));
  assert.equal((await lstat(join(f.runtime, 'node_modules'))).isSymbolicLink(), true);
  const generated = await readFile(join(f.runtime, RUNTIME_FILES.generated), 'utf8');
  assert.equal(generated, generateRepositoryPresetSource(themeCss));
  const nextConfig = await readFile(join(f.runtime, 'next.config.ts'), 'utf8');
  assert.match(nextConfig, /root: resolve\(process\.cwd\(\), "\.\."\)/);
  const actionBar = await readFile(join(f.runtime, 'components/editor/action-bar/action-bar.tsx'), 'utf8');
  const actionButtons = await readFile(
    join(f.runtime, 'components/editor/action-bar/components/action-bar-buttons.tsx'),
    'utf8',
  );
  const codePanel = await readFile(join(f.runtime, 'components/editor/code-panel.tsx'), 'utf8');
  const rootPage = await readFile(join(f.runtime, 'app/page.tsx'), 'utf8');
  assert.match(rootPage, /<Header \/>/);
  assert.match(rootPage, /<Editor themePromise=\{themePromise\} \/>/);
  assert.match(rootPage, /Promise\.resolve\(null\)/);
  assert.match(rootPage, /h-svh/);
  assert.doesNotMatch(rootPage, /AIGenerationCTA|Hero|Footer|getTheme|themeId|params|redirect/);
  assert.match(actionBar, /setCodePanelOpen/);
  assert.match(actionBar, /onExportClick/);
  assert.doesNotMatch(actionBar, /handleSaveClick|handleShareClick|onCodeClick/);
  assert.equal((actionButtons.match(/Export CSS/g) ?? []).length, 1);
  assert.match(actionButtons, /onExportClick/);
  assert.match(actionButtons, /<Button variant="default"/);
  assert.match(actionButtons, /<Download \/>/);
  assert.doesNotMatch(actionButtons, /CodeButton|onCodeClick|hidden[^\n]*Export CSS/);
  assert.match(codePanel, /Theme Code/);
  assert.match(codePanel, /index\.css/);
  assert.doesNotMatch(codePanel, /Save theme|registry command/i);
  const marker = JSON.parse(await readFile(join(f.runtime, RUNTIME_FILES.marker), 'utf8'));
  assert.deepEqual(Object.keys(marker.files), [
    'app/layout.tsx',
    'app/page.tsx',
    'components/editor/action-bar/action-bar.tsx',
    'components/editor/action-bar/components/action-bar-buttons.tsx',
    'components/editor/code-panel.tsx',
    'components/editor/theme-control-panel.tsx',
    'components/editor/theme-preset-select.tsx',
    'components/editor/theme-preview-panel.tsx',
    'components/header.tsx',
    'hooks/use-dialog-actions.tsx',
    'next.config.ts',
    'utils/csf-repository-presets.ts',
    'utils/theme-presets.ts',
  ]);
  assert.equal(marker.generatorVersion, GENERATOR_VERSION);
  assert.equal(marker.commit, f.commit);
  assert.equal(marker.runtime, f.runtime);
  await mkdir(join(f.runtime, '.next'));
  await writeFile(join(f.runtime, '.next/warm'), 'keep\n');

  const second = await ensureTweakcnRuntime({ config: f.config, themeCss });
  assert.equal(second.reused, true);
  assert.equal(await readFile(join(f.runtime, '.next/warm'), 'utf8'), 'keep\n');
  assert.equal(git(f.checkout, 'status', '--porcelain'), '');
});

test('validator accepts a setup-created runtime without modifying it', async () => {
  const f = await fixture();
  const setup = await ensureTweakcnRuntime({ config: f.config, themeCss });
  await mkdir(join(f.runtime, '.next'));
  await writeFile(join(f.runtime, '.next/warm'), 'keep\n');
  const beforeMarker = await readFile(join(f.runtime, RUNTIME_FILES.marker), 'utf8');

  const result = await requireTweakcnRuntime({ config: f.config, themeCss });

  assert.equal(result.reused, true);
  assert.deepEqual(result.marker, setup.marker);
  assert.equal(await readFile(join(f.runtime, RUNTIME_FILES.marker), 'utf8'), beforeMarker);
  assert.equal(await readFile(join(f.runtime, '.next/warm'), 'utf8'), 'keep\n');
  assert.equal(git(f.checkout, 'status', '--porcelain'), '');
});

test('validator rejects missing, stale, tampered, or incorrectly linked runtimes without repair', async (t) => {
  await t.test('missing runtime', async () => {
    const f = await fixture();
    await assert.rejects(requireTweakcnRuntime({ config: f.config, themeCss }), /pnpm tweakcn:setup/i);
    await assert.rejects(lstat(f.runtime));
  });

  await t.test('theme-stale runtime', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    const markerPath = join(f.runtime, RUNTIME_FILES.marker);
    const beforeMarker = await readFile(markerPath, 'utf8');
    const changedTheme = themeCss.replace(/(--radius:\s*)[^;]+/, '$10.777rem');

    await assert.rejects(
      requireTweakcnRuntime({ config: f.config, themeCss: changedTheme }),
      /pnpm tweakcn:setup/i,
    );
    assert.equal(await readFile(markerPath, 'utf8'), beforeMarker);
  });

  await t.test('tampered managed file', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    const path = join(f.runtime, 'components/editor/theme-preview-panel.tsx');
    const tampered = `${await readFile(path, 'utf8')}\n// tampered\n`;
    await writeFile(path, tampered);

    await assert.rejects(requireTweakcnRuntime({ config: f.config, themeCss }), /pnpm tweakcn:setup/i);
    assert.equal(await readFile(path, 'utf8'), tampered);
  });

  await t.test('incorrect dependency link', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    const link = join(f.runtime, 'node_modules');
    const wrong = join(f.root, 'wrong-dependencies');
    await mkdir(wrong);
    execFileSync('rm', ['-rf', link]);
    await symlink(wrong, link);

    await assert.rejects(requireTweakcnRuntime({ config: f.config, themeCss }), /pnpm tweakcn:setup/i);
    assert.equal((await lstat(link)).isSymbolicLink(), true);
    assert.equal(resolve(dirname(link), await readlink(link)), wrong);
  });
});

test('materializer regenerates when managed upstream source changes', async () => {
  const f = await fixture();
  const first = await ensureTweakcnRuntime({ config: f.config, themeCss });
  const changedSource = UPSTREAM_SHELL_FILES['components/header.tsx'].replace('Local controls', 'Local toolbar');
  await writeFile(join(f.checkout, 'components/header.tsx'), changedSource);
  git(f.checkout, 'add', 'components/header.tsx');
  git(f.checkout, 'commit', '-qm', 'upstream change');
  f.config.commit = git(f.checkout, 'rev-parse', 'HEAD');

  const second = await ensureTweakcnRuntime({ config: f.config, themeCss });
  assert.equal(second.reused, false);
  assert.notDeepEqual(second.marker.files['components/header.tsx'], first.marker.files['components/header.tsx']);
  assert.match(await readFile(join(f.runtime, 'components/header.tsx'), 'utf8'), /Local toolbar/);

  const third = await ensureTweakcnRuntime({ config: f.config, themeCss });
  assert.equal(third.reused, true);
  assert.deepEqual(third.marker, second.marker);
});

test('materializer regenerates when any managed runtime file is tampered with', async () => {
  const f = await fixture();
  const first = await ensureTweakcnRuntime({ config: f.config, themeCss });
  const path = join(f.runtime, 'components/editor/theme-preview-panel.tsx');
  await writeFile(path, `${await readFile(path, 'utf8')}\n// tampered\n`);

  const second = await ensureTweakcnRuntime({ config: f.config, themeCss });
  assert.equal(second.reused, false);
  assert.deepEqual(second.marker, first.marker);
  assert.doesNotMatch(await readFile(path, 'utf8'), /tampered/);
});

test('materializer regenerates deterministically when authoritative theme input changes', async () => {
  const f = await fixture();
  const first = await ensureTweakcnRuntime({ config: f.config, themeCss });
  const changedTheme = themeCss.replace(/(--radius:\s*)[^;]+/, '$10.777rem');
  assert.notEqual(changedTheme, themeCss);

  const second = await ensureTweakcnRuntime({ config: f.config, themeCss: changedTheme });
  assert.equal(second.reused, false);
  assert.notEqual(second.marker.themeHash, first.marker.themeHash);
  assert.equal(second.marker.generatorVersion, GENERATOR_VERSION);
  assert.equal(
    await readFile(join(f.runtime, RUNTIME_FILES.generated), 'utf8'),
    generateRepositoryPresetSource(changedTheme),
  );

  const third = await ensureTweakcnRuntime({ config: f.config, themeCss: changedTheme });
  assert.equal(third.reused, true);
  assert.deepEqual(third.marker, second.marker);
  assert.equal(git(f.checkout, 'status', '--porcelain'), '');
});

test('materializer rebuilds stale owned runtimes and refuses unsafe runtime ownership', async (t) => {
  await t.test('stale owned runtime', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    const markerPath = join(f.runtime, RUNTIME_FILES.marker);
    const marker = JSON.parse(await readFile(markerPath, 'utf8'));
    marker.themeHash = 'stale';
    marker.generatorVersion -= 1;
    await writeFile(markerPath, `${JSON.stringify(marker)}\n`);
    const result = await ensureTweakcnRuntime({ config: f.config, themeCss });
    assert.equal(result.reused, false);
    const rebuilt = JSON.parse(await readFile(markerPath, 'utf8'));
    assert.equal(rebuilt.themeHash, result.marker.themeHash);
    assert.equal(rebuilt.generatorVersion, result.marker.generatorVersion);
  });

  await t.test('unmarked runtime', async () => {
    const f = await fixture();
    await mkdir(f.runtime);
    await writeFile(join(f.runtime, 'mine'), 'do not delete\n');
    await assert.rejects(ensureTweakcnRuntime({ config: f.config, themeCss }), /unmarked/i);
    assert.equal(await readFile(join(f.runtime, 'mine'), 'utf8'), 'do not delete\n');
  });

  await t.test('foreign-owned runtime', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    const markerPath = join(f.runtime, RUNTIME_FILES.marker);
    const marker = JSON.parse(await readFile(markerPath, 'utf8'));
    marker.checkout = join(f.root, 'other-checkout');
    await writeFile(markerPath, `${JSON.stringify(marker)}\n`);
    await assert.rejects(ensureTweakcnRuntime({ config: f.config, themeCss }), /different checkout|foreign/i);
  });

  await t.test('symlinked runtime', async () => {
    const f = await fixture();
    const foreign = join(f.root, 'foreign');
    await mkdir(foreign);
    await symlink(foreign, f.runtime);
    await assert.rejects(ensureTweakcnRuntime({ config: f.config, themeCss }), /regular directory/i);
  });

  await t.test('missing dependencies preserves an existing runtime', async () => {
    const f = await fixture();
    await ensureTweakcnRuntime({ config: f.config, themeCss });
    await writeFile(join(f.runtime, 'preserved'), 'yes\n');
    execFileSync('rm', ['-rf', join(f.checkout, 'node_modules')]);
    await assert.rejects(ensureTweakcnRuntime({ config: f.config, themeCss }), /tweakcn:setup/i);
    assert.equal(await readFile(join(f.runtime, 'preserved'), 'utf8'), 'yes\n');
  });
});

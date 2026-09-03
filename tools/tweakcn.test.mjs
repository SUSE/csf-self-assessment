import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  UPSTREAM_NEXT_CONFIG,
  UPSTREAM_PRESETS,
  UPSTREAM_SHELL_FILES,
} from './tweakcn-test-project.mjs';
import { REPOSITORY_PRESETS } from './tweakcn-runtime.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CLI = join(ROOT, 'tools/tweakcn.mjs');
const { canonicalOrigin } = await import('./tweakcn.mjs');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function fixture({ lockfile = true, devScript = true } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'tweakcn-test-'));
  const upstream = join(root, 'upstream');
  execFileSync('git', ['init', '-q', upstream]);
  git(upstream, 'config', 'user.email', 'test@example.invalid');
  git(upstream, 'config', 'user.name', 'Test');
  await writeFile(
    join(upstream, 'package.json'),
    JSON.stringify({ private: true, scripts: devScript ? { dev: 'node dev.mjs' } : {} }),
  );
  if (lockfile) await writeFile(join(upstream, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  await writeFile(join(upstream, 'dev.mjs'), 'console.log("editor ready")\n');
  await writeFile(join(upstream, '.gitignore'), 'node_modules/\n.next/\n');
  await mkdir(join(upstream, 'utils'));
  await writeFile(join(upstream, 'utils/theme-presets.ts'), UPSTREAM_PRESETS);
  await writeFile(join(upstream, 'next.config.ts'), UPSTREAM_NEXT_CONFIG);
  for (const [path, source] of Object.entries(UPSTREAM_SHELL_FILES)) {
    await mkdir(join(upstream, path, '..'), { recursive: true });
    await writeFile(join(upstream, path), source);
  }
  git(upstream, 'add', '.');
  git(upstream, 'commit', '-qm', 'fixture');
  const commit = git(upstream, 'rev-parse', 'HEAD');

  const realRoot = await realpath(root);
  const checkout = join(realRoot, '.tools/tweakcn');
  const runtime = join(realRoot, '.tools/tweakcn-runtime');
  const config = join(root, 'tweakcn.config.json');
  await writeFile(config, JSON.stringify({ upstream, checkout, runtime, commit }, null, 2));

  const bin = join(root, 'bin');
  execFileSync('mkdir', ['-p', bin]);
  const log = join(root, 'pnpm.log');
  const fakePnpm = join(bin, 'pnpm');
  await writeFile(
    fakePnpm,
    '#!/bin/sh\nprintf \'%s|%s\\n\' "$PWD" "$*" >> "$TWEAKCN_TEST_LOG"\nif [ "$1" = "install" ]; then\n  mkdir -p node_modules/.bin\n  printf \'#!/bin/sh\\n\' > node_modules/.bin/next\n  chmod +x node_modules/.bin/next\nfi\n',
  );
  await chmod(fakePnpm, 0o755);

  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    TWEAKCN_TEST_LOG: log,
  };
  return { root, upstream, checkout, runtime, config, commit, log, env };
}

test('origin comparison treats HTTPS, SSH URL, and SCP transports as the same repository', () => {
  const expected = 'github.com/jnsahaj/tweakcn';
  assert.equal(canonicalOrigin('https://github.com/jnsahaj/tweakcn.git'), expected);
  assert.equal(canonicalOrigin('ssh://git@github.com/jnsahaj/tweakcn.git'), expected);
  assert.equal(canonicalOrigin('git@github.com:jnsahaj/tweakcn.git'), expected);
});

function run(f, command, { ok = true } = {}) {
  const result = spawnSync(process.execPath, [CLI, command, '--config', f.config], {
    cwd: ROOT,
    env: f.env,
    encoding: 'utf8',
  });
  if (ok && result.status !== 0) {
    assert.fail(`${command} failed:\n${result.stdout}\n${result.stderr}`);
  }
  if (!ok) assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
  return result;
}

test('setup clones the exact clean pin, installs dependencies, and materializes the patched runtime', async () => {
  const f = await fixture();
  const result = run(f, 'setup');

  assert.equal(git(f.checkout, 'rev-parse', 'HEAD'), f.commit);
  const symbolic = spawnSync('git', ['symbolic-ref', '-q', 'HEAD'], { cwd: f.checkout });
  assert.notEqual(symbolic.status, 0);
  assert.equal(git(f.checkout, 'remote', 'get-url', 'origin'), f.upstream);
  assert.equal(git(f.checkout, 'status', '--porcelain'), '');
  const repositoryPresets = await readFile(join(f.runtime, 'utils/csf-repository-presets.ts'), 'utf8');
  // Derived from the authoritative list, never a copy of it: a hand-written
  // roster here silently passed while three palettes were added, and asserted
  // five presets against a runtime that emits one per canonical palette.
  for (const { label } of REPOSITORY_PRESETS) {
    assert.match(repositoryPresets, new RegExp(label));
  }
  assert.equal(
    (repositoryPresets.match(/"source": "BUILT_IN"/g) ?? []).length,
    REPOSITORY_PRESETS.length,
  );
  assert.match(await readFile(join(f.runtime, 'utils/theme-presets.ts'), 'utf8'), /\.\.\.csfRepositoryPresets/);
  assert.match(await readFile(join(f.runtime, 'next.config.ts'), 'utf8'), /root: resolve\(process\.cwd\(\), "\.\."\)/);
  assert.doesNotMatch(await readFile(join(f.runtime, 'components/header.tsx'), 'utf8'), /GetProCTA|UserProfileDropdown/);
  assert.doesNotMatch(await readFile(join(f.runtime, 'app/layout.tsx'), 'utf8'), /AuthDialogWrapper|GetProDialogWrapper/);
  const rootPage = await readFile(join(f.runtime, 'app/page.tsx'), 'utf8');
  assert.match(rootPage, /<Header \/>/);
  assert.match(rootPage, /<Editor themePromise=\{themePromise\} \/>/);
  assert.match(rootPage, /Promise\.resolve\(null\)/);
  assert.doesNotMatch(rootPage, /AIGenerationCTA|Hero|Footer|getTheme|themeId|params|redirect/);
  const actionButtons = await readFile(
    join(f.runtime, 'components/editor/action-bar/components/action-bar-buttons.tsx'),
    'utf8',
  );
  assert.equal((actionButtons.match(/Export CSS/g) ?? []).length, 1);
  assert.match(actionButtons, /onExportClick/);
  assert.match(actionButtons, /<Button variant="default"/);
  assert.doesNotMatch(actionButtons, /CodeButton|onCodeClick|SaveButton|ShareButton|PublishButton/);
  assert.match(await readFile(join(f.runtime, 'components/editor/code-panel.tsx'), 'utf8'), /Theme Code/);
  assert.doesNotMatch(await readFile(join(f.runtime, 'components/editor/theme-control-panel.tsx'), 'utf8'), /Generate|ChatInterface/);
  assert.doesNotMatch(await readFile(join(f.runtime, 'components/editor/theme-preview-panel.tsx'), 'utf8'), /handleOpenInV0|V0Logo/);
  assert.doesNotMatch(await readFile(join(f.checkout, 'utils/theme-presets.ts'), 'utf8'), /csfRepositoryPresets/);
  assert.doesNotMatch(await readFile(join(f.checkout, 'next.config.ts'), 'utf8'), /root: resolve/);
  assert.match(await readFile(join(f.checkout, 'components/header.tsx'), 'utf8'), /GetProCTA|UserProfileDropdown/);
  assert.match(await readFile(join(f.checkout, 'app/page.tsx'), 'utf8'), /AIGenerationCTA|Hero|Footer/);
  assert.match(await readFile(join(f.checkout, 'components/editor/action-bar/components/action-bar-buttons.tsx'), 'utf8'), /CodeButton/);
  assert.match(result.stdout, /generated runtime/);
  assert.equal(
    await readFile(f.log, 'utf8'),
    `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n`,
  );
});

test('setup is repeatable for a clean pinned checkout', async () => {
  const f = await fixture();
  run(f, 'setup');
  run(f, 'setup');
  assert.equal(
    await readFile(f.log, 'utf8'),
    `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n`,
  );
});

test('setup refuses to destroy a dirty checkout', async () => {
  const f = await fixture();
  run(f, 'setup');
  await writeFile(join(f.checkout, 'package.json'), '{}\n');
  const result = run(f, 'setup', { ok: false });
  assert.match(result.stderr, /dirty/i);
  assert.equal(await readFile(join(f.checkout, 'package.json'), 'utf8'), '{}\n');
});

test('setup and dev refuse a checkout with the wrong origin', async () => {
  const f = await fixture();
  run(f, 'setup');
  git(f.checkout, 'remote', 'set-url', 'origin', join(f.root, 'other'));
  assert.match(run(f, 'setup', { ok: false }).stderr, /origin/i);
  assert.match(run(f, 'dev', { ok: false }).stderr, /origin/i);
});

test('setup refuses an unavailable commit without silently following the upstream branch', async () => {
  const f = await fixture();
  const missing = '0123456789abcdef0123456789abcdef01234567';
  await writeFile(
    f.config,
    JSON.stringify({
      upstream: f.upstream,
      checkout: f.checkout,
      runtime: f.runtime,
      commit: missing,
    }),
  );
  const result = run(f, 'setup', { ok: false });
  assert.match(result.stderr, /commit|fetch|revision/i);
});

test('setup rejects a checkout missing the pinned lockfile or dev script', async (t) => {
  await t.test('missing lockfile', async () => {
    const f = await fixture({ lockfile: false });
    assert.match(run(f, 'setup', { ok: false }).stderr, /pnpm-lock\.yaml/);
  });
  await t.test('missing dev script', async () => {
    const f = await fixture({ devScript: false });
    assert.match(run(f, 'setup', { ok: false }).stderr, /dev script/i);
  });
});

test('dev validates and launches the unchanged setup-created runtime', async () => {
  const f = await fixture();
  run(f, 'setup');
  await mkdir(join(f.runtime, '.next'));
  await writeFile(join(f.runtime, '.next/warm'), 'keep\n');
  const before = git(f.checkout, 'rev-parse', 'HEAD');
  const beforeMarker = await readFile(join(f.runtime, '.csf-tweakcn-runtime.json'), 'utf8');
  const result = run(f, 'dev');
  const after = git(f.checkout, 'rev-parse', 'HEAD');

  assert.equal(before, after);
  assert.equal(git(f.checkout, 'status', '--porcelain'), '');
  assert.match(result.stdout, /validated runtime/);
  assert.equal(await readFile(join(f.runtime, '.csf-tweakcn-runtime.json'), 'utf8'), beforeMarker);
  assert.equal(await readFile(join(f.runtime, '.next/warm'), 'utf8'), 'keep\n');
  assert.equal(
    await readFile(f.log, 'utf8'),
    `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n${f.runtime}|dev\n`,
  );
});

test('dev refuses missing or tampered runtimes with setup guidance and no repair', async (t) => {
  await t.test('missing runtime', async () => {
    const f = await fixture();
    run(f, 'setup');
    execFileSync('rm', ['-rf', f.runtime]);

    const result = run(f, 'dev', { ok: false });

    assert.match(result.stderr, /pnpm tweakcn:setup/i);
    await assert.rejects(readFile(join(f.runtime, '.csf-tweakcn-runtime.json'), 'utf8'));
    assert.equal(
      await readFile(f.log, 'utf8'),
      `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n`,
    );
  });

  await t.test('tampered managed file', async () => {
    const f = await fixture();
    run(f, 'setup');
    const path = join(f.runtime, 'components/editor/theme-preview-panel.tsx');
    const tampered = `${await readFile(path, 'utf8')}\n// tampered\n`;
    await writeFile(path, tampered);

    const result = run(f, 'dev', { ok: false });

    assert.match(result.stderr, /pnpm tweakcn:setup/i);
    assert.equal(await readFile(path, 'utf8'), tampered);
    assert.equal(
      await readFile(f.log, 'utf8'),
      `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n`,
    );
  });
});

test('dev refuses missing dependencies without fetching or installing', async () => {
  const f = await fixture();
  run(f, 'setup');
  execFileSync('rm', ['-rf', join(f.checkout, 'node_modules')]);
  const result = run(f, 'dev', { ok: false });
  assert.match(result.stderr, /tweakcn:setup/i);
  assert.equal(
    await readFile(f.log, 'utf8'),
    `${f.checkout}|install --frozen-lockfile --ignore-workspace --dangerously-allow-all-builds\n`,
  );
});

test('dev refuses a dirty, unpinned, or incomplete checkout instead of fetching or installing', async (t) => {
  await t.test('dirty', async () => {
    const f = await fixture();
    run(f, 'setup');
    await writeFile(join(f.checkout, 'dev.mjs'), 'changed\n');
    assert.match(run(f, 'dev', { ok: false }).stderr, /dirty/i);
  });
  await t.test('wrong commit', async () => {
    const f = await fixture();
    run(f, 'setup');
    await writeFile(join(f.upstream, 'next'), 'next\n');
    git(f.upstream, 'add', '.');
    git(f.upstream, 'commit', '-qm', 'next');
    git(f.checkout, 'fetch', '-q', 'origin');
    const next = git(f.upstream, 'rev-parse', 'HEAD');
    git(f.checkout, 'switch', '-q', '--detach', next);
    assert.match(run(f, 'dev', { ok: false }).stderr, /pinned commit/i);
  });
  await t.test('missing lockfile', async () => {
    const f = await fixture();
    run(f, 'setup');
    execFileSync('rm', [join(f.checkout, 'pnpm-lock.yaml')]);
    assert.match(run(f, 'dev', { ok: false }).stderr, /dirty|pnpm-lock\.yaml/i);
  });
});

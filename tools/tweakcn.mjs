#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ensureTweakcnRuntime, requireTweakcnRuntime } from './tweakcn-runtime.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CONFIG = resolve(REPO_ROOT, 'tools/tweakcn.config.json');
const THEME_PATH = resolve(REPO_ROOT, 'packages/platform/src/ui/theme.css');

function fail(message) {
  throw new Error(`tweakcn: ${message}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    ...options,
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter(Boolean)
      .map((part) => part.trim())
      .filter(Boolean)
      .join('\n');
    fail(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
  }
  return (result.stdout ?? '').trim();
}

function git(checkout, ...args) {
  return run('git', ['-C', checkout, ...args]);
}

export function canonicalOrigin(value) {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.protocol === 'file:') return resolve(url.pathname);
    return `${url.hostname.toLowerCase()}/${url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '')}`;
  }
  const scp = value.match(/^(?:[^@]+@)?([^:]+):(.+)$/);
  if (scp && !/^[A-Za-z]:[\\/]/.test(value)) {
    return `${scp[1].toLowerCase()}/${scp[2].replace(/^\/+|\/+$/g, '').replace(/\.git$/, '')}`;
  }
  return resolve(value);
}

async function loadConfig(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    fail(`cannot read config ${path}: ${error.message}`);
  }
  for (const key of ['upstream', 'checkout', 'runtime', 'commit']) {
    if (typeof parsed[key] !== 'string' || parsed[key].trim() === '') {
      fail(`config ${path} needs a non-empty ${key}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(parsed.commit)) {
    fail('config commit must be a full lowercase 40-character Git SHA');
  }
  const config = {
    upstream: parsed.upstream,
    checkout: isAbsolute(parsed.checkout) ? parsed.checkout : resolve(REPO_ROOT, parsed.checkout),
    runtime: isAbsolute(parsed.runtime) ? parsed.runtime : resolve(REPO_ROOT, parsed.runtime),
    commit: parsed.commit,
  };
  if (config.checkout === config.runtime) fail('checkout and runtime must be distinct');
  if (resolve(path) === DEFAULT_CONFIG) {
    const relativeRuntime = relative(REPO_ROOT, config.runtime);
    if (relativeRuntime.startsWith('..') || !relativeRuntime.startsWith('.tools/')) {
      fail('production runtime must live under ignored .tools/');
    }
  }
  return config;
}

function assertOrigin(config) {
  const actual = git(config.checkout, 'remote', 'get-url', 'origin');
  if (canonicalOrigin(actual) !== canonicalOrigin(config.upstream)) {
    fail(`wrong origin: expected ${config.upstream}, found ${actual}`);
  }
}

function assertClean(config) {
  const status = git(config.checkout, 'status', '--porcelain');
  if (status !== '') fail('checkout is dirty; refusing to reset, clean, or stash it');
}

function assertPinned(config) {
  const actual = git(config.checkout, 'rev-parse', 'HEAD');
  if (actual !== config.commit) {
    fail(`checkout is not at the pinned commit ${config.commit}; found ${actual}`);
  }
  const symbolic = spawnSync('git', ['-C', config.checkout, 'symbolic-ref', '-q', 'HEAD'], {
    encoding: 'utf8',
  });
  if (symbolic.status === 0) fail('checkout must be detached at the pinned commit');
}

async function assertProjectShape(config) {
  const lockfile = resolve(config.checkout, 'pnpm-lock.yaml');
  if (!existsSync(lockfile)) fail('pinned checkout has no pnpm-lock.yaml');

  let pkg;
  try {
    pkg = JSON.parse(await readFile(resolve(config.checkout, 'package.json'), 'utf8'));
  } catch (error) {
    fail(`pinned checkout has no readable package.json: ${error.message}`);
  }
  if (typeof pkg.scripts?.dev !== 'string' || pkg.scripts.dev.trim() === '') {
    fail('pinned checkout package.json has no dev script');
  }
}

async function preflight(config) {
  if (!existsSync(resolve(config.checkout, '.git'))) {
    fail(`checkout does not exist at ${config.checkout}; run pnpm tweakcn:setup`);
  }
  assertOrigin(config);
  assertClean(config);
  assertPinned(config);
  await assertProjectShape(config);
}

async function setup(config) {
  let fresh = false;
  if (!existsSync(config.checkout)) {
    await mkdir(dirname(config.checkout), { recursive: true });
    run('git', ['clone', '--no-checkout', config.upstream, config.checkout]);
    fresh = true;
  } else if (!existsSync(resolve(config.checkout, '.git'))) {
    fail(`${config.checkout} exists but is not a Git checkout`);
  }

  assertOrigin(config);
  if (!fresh) assertClean(config);

  let hasCommit = spawnSync(
    'git',
    ['-C', config.checkout, 'cat-file', '-e', `${config.commit}^{commit}`],
    { stdio: 'ignore' },
  ).status === 0;
  if (!hasCommit) {
    run('git', ['-C', config.checkout, 'fetch', '--no-tags', 'origin', config.commit]);
    hasCommit = spawnSync(
      'git',
      ['-C', config.checkout, 'cat-file', '-e', `${config.commit}^{commit}`],
      { stdio: 'ignore' },
    ).status === 0;
  }
  if (!hasCommit) fail(`pinned commit ${config.commit} is unavailable from origin`);

  run('git', ['-C', config.checkout, 'checkout', '--detach', config.commit]);
  await preflight(config);
  run(
    'pnpm',
    [
      'install',
      '--frozen-lockfile',
      // The nested checkout must not join this repository's parent workspace.
      '--ignore-workspace',
      // The pinned lockfile includes native packages (notably sharp/esbuild).
      '--dangerously-allow-all-builds',
    ],
    { cwd: config.checkout, inherit: true },
  );
  const themeCss = await readFile(THEME_PATH, 'utf8');
  const runtime = await ensureTweakcnRuntime({ config, themeCss });
  await preflight(config);
  console.log(`tweakcn: ready at ${config.commit}`);
  console.log(
    `tweakcn: ${runtime.reused ? 'reusing' : 'generated'} runtime with repository presets at ${runtime.runtime}`,
  );
}

async function dev(config) {
  await preflight(config);
  const themeCss = await readFile(THEME_PATH, 'utf8');
  const runtime = await requireTweakcnRuntime({ config, themeCss });
  await preflight(config);
  console.log(`tweakcn: validated runtime at ${runtime.runtime}`);
  const child = spawn('pnpm', ['dev'], { cwd: runtime.runtime, stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(`tweakcn: pnpm dev could not start: ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 1;
  });
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  let configPath = DEFAULT_CONFIG;
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] !== '--config' || !rest[i + 1]) {
      fail(`unknown argument ${rest[i] ?? ''}`.trim());
    }
    configPath = resolve(rest[++i]);
  }
  if (command !== 'setup' && command !== 'dev') {
    fail('usage: node tools/tweakcn.mjs <setup|dev> [--config <file>]');
  }
  return { command, configPath };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { command, configPath } = parseArgs(process.argv.slice(2));
    const config = await loadConfig(configPath);
    if (command === 'setup') await setup(config);
    else await dev(config);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

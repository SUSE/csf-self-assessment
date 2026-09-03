#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PALETTE_PRESETS = Object.freeze({
  suse: { presetId: 'csf-suse', label: 'CSF-SUSE' },
  claymorphism: { presetId: 'csf-claymorphism', label: 'CSF-Claymorphism' },
  cleanslate: { presetId: 'csf-cleanslate', label: 'CSF-Cleanslate' },
  'modern-minimal': { presetId: 'csf-modern-minimal', label: 'CSF-Modern Minimal' },
  supabase: { presetId: 'csf-supabase', label: 'CSF-Supabase' },
});
const PALETTES = new Set(Object.keys(PALETTE_PRESETS));
const STATE_DIR = '.tools/tweakcn-session';
const PID_FILE = `${STATE_DIR}/server.pid`;
const LOG_FILE = `${STATE_DIR}/server.log`;
const BASELINE_FILE = `${STATE_DIR}/baseline.css`;
const ACTIVE_PALETTE_FILE = `${STATE_DIR}/palette`;
export const EDITOR_URL = 'http://localhost:3000/';
const BROWSER_SESSION = 'tweakcn';
export const FORBIDDEN_EDITOR_CONTROL_NAMES = Object.freeze([
  'Sign In',
  'Sign Up',
  'Get Pro',
  'Save Theme',
  'Share',
  'Publish',
  'Saved Themes',
  'Manage',
  'Discover more themes',
  'Generate',
  'Save your theme to get the registry command',
  'Open theme in v0',
]);
export const FORBIDDEN_REQUEST_PATTERNS = Object.freeze([
  /\/api\/auth(?:\/|$)/i,
  /\/api\/themes?(?:\/|\?|$)/i,
  /\/api\/(?:subscription|billing|share|community)(?:\/|\?|$)/i,
  /\/r\/v0(?:\/|\?|$)/i,
  /v0\.dev\/chat\/api\/open/i,
]);
function fail(message) {
  throw new Error(`tweakcn-session: ${message}`);
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
  if (result.error && !options.allowFailure) {
    fail(`${command} could not start: ${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('').trim();
    fail(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
  }
  return result;
}

function run(command, args, options = {}) {
  return (execute(command, args, options).stdout ?? '').trim();
}

export function repositoryRoot() {
  for (const required of [
    'tools/tweakcn.config.json',
    'tools/tweakcn.mjs',
    'packages/platform/scripts/theme-palette-bridge.mjs',
  ]) {
    if (!existsSync(resolve(REPO_ROOT, required))) fail(`this repository is missing ${required}`);
  }
  return REPO_ROOT;
}

export function requirePalette(value) {
  if (!PALETTES.has(value)) fail(`unknown palette ${value}; expected ${[...PALETTES].join(', ')}`);
  return value;
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function currentPid(repo) {
  try {
    return Number((await readFile(resolve(repo, PID_FILE), 'utf8')).trim());
  } catch {
    return null;
  }
}

async function editorIsReady() {
  const response = await fetch(EDITOR_URL).catch(() => null);
  if (!response?.ok) return false;
  return (await response.text()).toLowerCase().includes('tweakcn');
}

function browser(args, options = {}) {
  const result = execute('playwright-cli', [`-s=${BROWSER_SESSION}`, ...args], options);
  return (result.stdout ?? '').trim();
}

async function exportPalette(repo, id) {
  const path = resolve(repo, `.tools/${id}.css`);
  run('pnpm', ['theme:tweakcn:export', '--', '--palette', id, '--out', path], {
    cwd: repo,
    inherit: true,
  });
  return path;
}

function paletteValues(css) {
  const rule = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return css.match(new RegExp(`${escaped}\\s*{([^}]+)}`))?.[1] ?? '';
  };
  const declarations = (body) =>
    Object.fromEntries(
      [...body.matchAll(/--([^:]+):\s*([^;]+);/g)].map((match) => [match[1].trim(), match[2].trim()]),
    );
  return { light: declarations(rule(':root')), dark: declarations(rule('.dark')) };
}

export function editorShellAssertionSource({ closeDialog = true } = {}) {
  return `
    if (new URL(page.url()).pathname !== '/') {
      throw new Error('managed editor must remain at /: ' + page.url());
    }
    const header = page.locator('header').first();
    const actionBar = page.locator('header').first().locator('xpath=following::div[contains(@class,"border-b")][1]');
    const controlPanel = page.getByRole('tabpanel', { name: 'Colors' }).locator('xpath=ancestor::div[contains(@class,"flex")][1]');
    const exportButtons = page.getByRole('button', { name: 'Export CSS', exact: true });
    const visibleExportButtons = [];
    for (let index = 0; index < await exportButtons.count(); index += 1) {
      if (await exportButtons.nth(index).isVisible()) visibleExportButtons.push(exportButtons.nth(index));
    }
    if (visibleExportButtons.length !== 1) throw new Error('expected exactly one visible Export CSS action');
    if ((await visibleExportButtons[0].innerText()).trim() !== 'Export CSS') {
      throw new Error('Export CSS action must keep its literal label visible');
    }
    await visibleExportButtons[0].click();
    const codeDialog = page.getByRole('dialog', { name: 'Theme Code' });
    await codeDialog.getByRole('tab', { name: 'index.css' }).waitFor({ timeout: 10000 });
    const forbidden = ${JSON.stringify(FORBIDDEN_EDITOR_CONTROL_NAMES)};
    for (const surface of [header, actionBar, controlPanel, codeDialog]) {
      for (const name of forbidden) {
        const matches = surface.getByText(name, { exact: false });
        for (let index = 0; index < await matches.count(); index += 1) {
          if (await matches.nth(index).isVisible()) {
            throw new Error('forbidden local editor control: ' + name);
          }
        }
      }
    }
    ${closeDialog ? "await page.keyboard.press('Escape');" : ''}
  `;
}

export function mobileExportAssertionSource() {
  return `async page => {
    const originalViewport = page.viewportSize() ?? { width: 1280, height: 720 };
    await page.setViewportSize({ width: 767, height: 900 });
    try {
      const previewTab = page.getByRole('tab', { name: 'Preview', exact: true });
      await previewTab.waitFor({ timeout: 10000 });
      await previewTab.click();
      const exportButton = page.getByRole('button', { name: 'Export CSS', exact: true });
      await exportButton.waitFor({ state: 'visible', timeout: 10000 });
      if ((await exportButton.innerText()).trim() !== 'Export CSS') {
        throw new Error('Export CSS label is not visible below md');
      }
    } finally {
      await page.setViewportSize(originalViewport);
    }
  }`;
}

export function requestObservationStartSource() {
  return `async page => {
    if (page.__csfForbiddenRequestListener) {
      page.off('request', page.__csfForbiddenRequestListener);
    }
    page.__csfForbiddenRequests = [];
    const requestPatterns = ${JSON.stringify(FORBIDDEN_REQUEST_PATTERNS.map((pattern) => pattern.source))};
    page.__csfForbiddenRequestListener = request => {
      const url = request.url();
      if (requestPatterns.some(pattern => new RegExp(pattern, 'i').test(url))) {
        page.__csfForbiddenRequests.push(url);
      }
    };
    page.on('request', page.__csfForbiddenRequestListener);
  }`;
}

export function requestObservationFinishSource() {
  return `async page => {
    if (page.__csfForbiddenRequestListener) {
      page.off('request', page.__csfForbiddenRequestListener);
      delete page.__csfForbiddenRequestListener;
    }
    const forbiddenRequests = page.__csfForbiddenRequests ?? [];
    delete page.__csfForbiddenRequests;
    if (forbiddenRequests.length) {
      throw new Error('forbidden local editor request: ' + [...new Set(forbiddenRequests)].join(', '));
    }
  }`;
}

export function presetSelectionSource(id) {
  const preset = PALETTE_PRESETS[requirePalette(id)];
  return `async page => {
    await page.goto(${JSON.stringify(EDITOR_URL)});
    if (new URL(page.url()).pathname !== '/') {
      throw new Error('managed editor redirected away from /: ' + page.url());
    }
    const colors = page.getByRole('tabpanel', { name: 'Colors' });
    await colors.getByRole('textbox', { name: 'hex or tailwind' }).first().waitFor({ timeout: 10000 });
    const trigger = page.getByRole('button', { name: /default|CSF-/ }).first();
    await trigger.click();
    const item = page.getByRole('option', { name: ${JSON.stringify(preset.label)} });
    await item.waitFor({ timeout: 10000 });
    await item.click();
    await page.getByRole('button', { name: new RegExp(${JSON.stringify(preset.label)}) }).first().waitFor({ timeout: 10000 });
  }`;
}

export function presetValidationSource(id, source) {
  const preset = PALETTE_PRESETS[requirePalette(id)];
  return `async page => {
    await page.keyboard.press('Escape');
    ${editorShellAssertionSource({ closeDialog: false })}
    await codeDialog.getByRole('tab', { name: 'index.css' }).click();
    const exported = await codeDialog.getByRole('tabpanel', { name: 'index.css' }).locator('code').innerText();
    const declarations = selector => {
      const escaped = selector.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
      const body = exported.match(new RegExp(escaped + '\\\\s*\\\\{([^}]+)'))?.[1] ?? '';
      return Object.fromEntries([...body.matchAll(/--([^:]+):\\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
    };
    const source = ${JSON.stringify(source)};
    const actual = { light: declarations(':root'), dark: declarations('.dark') };
    const mismatches = await page.evaluate(({ actual, source }) => {
      const rgb = value => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      const close = (left, right) => rgb(left).every((channel, index) => Math.abs(channel - rgb(right)[index]) <= 2);
      const mismatches = [];
      for (const mode of ['light', 'dark']) {
        for (const token of ['background', 'primary', 'chart-5', 'sidebar-ring', 'destructive']) {
          if (!actual[mode][token] || !close(actual[mode][token], source[mode][token])) {
            mismatches.push(mode + ' --' + token);
          }
        }
      }
      return mismatches;
    }, { actual, source });
    if (actual.light.radius !== source.light.radius) mismatches.push('light --radius');
    if (mismatches.length) {
      throw new Error('stale/invalid runtime preset ${preset.label}: ' + mismatches.join(', '));
    }
    await page.keyboard.press('Escape');
  }`;
}

async function selectPresetInBrowser(id, cssPath) {
  const source = paletteValues(await readFile(cssPath, 'utf8'));
  browser(['run-code', requestObservationStartSource()]);
  try {
    browser(['run-code', presetSelectionSource(id)]);
    browser(['run-code', presetValidationSource(id, source)]);
    browser(['run-code', mobileExportAssertionSource()]);
    return await captureBrowserCss({ observeRequests: false, assertShell: false });
  } finally {
    browser(['run-code', requestObservationFinishSource()]);
  }
}

async function recordLoadedPalette(repo, id, baseline) {
  await writeFile(resolve(repo, BASELINE_FILE), baseline);
  await writeFile(resolve(repo, ACTIVE_PALETTE_FILE), `${id}\n`);
}

async function captureBrowserCss({ observeRequests = true, assertShell = true } = {}) {
  if (observeRequests) browser(['run-code', requestObservationStartSource()]);
  try {
    if (assertShell) {
      browser(['run-code', `async page => {
        await page.keyboard.press('Escape');
        ${editorShellAssertionSource()}
      }`]);
    }
    const raw = browser(['--raw', 'run-code', `async page => {
      const exportButtons = page.getByRole('button', { name: 'Export CSS', exact: true });
      for (let attempt = 0; attempt < 40; attempt += 1) {
        for (let index = 0; index < await exportButtons.count(); index += 1) {
          const exportButton = exportButtons.nth(index);
          if (!await exportButton.isVisible()) continue;
          if ((await exportButton.innerText()).trim() !== 'Export CSS') continue;
          await exportButton.click();
          const codeDialog = page.getByRole('dialog', { name: 'Theme Code' });
          await codeDialog.getByRole('tab', { name: 'index.css' }).click();
          return codeDialog.getByRole('tabpanel', { name: 'index.css' }).locator('code').innerText();
        }
        await page.waitForTimeout(250);
      }
      throw new Error('expected one visibly labelled Export CSS action');
    }`]);
    try {
      return JSON.parse(raw);
    } catch {
      fail(`could not decode CSS returned by playwright-cli: ${raw || '(empty output)'}`);
    }
  } finally {
    if (observeRequests) browser(['run-code', requestObservationFinishSource()]);
  }
}

async function captureFromBrowser(repo, id, capturedCss) {
  const activePalette = await readFile(resolve(repo, ACTIVE_PALETTE_FILE), 'utf8').catch(() => '');
  if (activePalette.trim() !== id) {
    fail(`browser contains ${activePalette.trim() || 'no recorded palette'}, not ${id}; load ${id} first`);
  }
  const previewCss = await readFile(resolve(repo, `.tools/${id}.css`), 'utf8');
  const protectedTokens = {};
  for (const mode of [':root', '.dark']) {
    const escaped = mode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = previewCss.match(new RegExp(`${escaped}\\s*{([^}]+)}`))?.[1] ?? '';
    protectedTokens[mode] = Object.fromEntries(
      [...body.matchAll(/--(destructive(?:-foreground)?):\s*([^;]+);/g)].map((match) => [
        match[1],
        match[2].trim(),
      ]),
    );
  }
  let css = capturedCss ?? await captureBrowserCss();
  const baseline = await readFile(resolve(repo, BASELINE_FILE), 'utf8').catch(() => '');
  if (!baseline) fail('browser baseline is missing; load the palette again');
  const currentValues = paletteValues(css);
  const baselineValues = paletteValues(baseline);
  const sourceValues = paletteValues(previewCss);
  for (const mode of ['light', 'dark']) {
    for (const token of Object.keys(sourceValues[mode])) {
      if (currentValues[mode][token] === baselineValues[mode][token]) {
        const selector = mode === 'light' ? ':root' : '.dark';
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rule = new RegExp(`(${escaped}\\s*{[^}]*?--${token}:\\s*)[^;]+`, 's');
        if (rule.test(css)) css = css.replace(rule, `$1${sourceValues[mode][token]}`);
      }
    }
  }
  for (const [selector, values] of Object.entries(protectedTokens)) {
    for (const [token, value] of Object.entries(values)) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rule = new RegExp(`(${escaped}\\s*{[^}]*?--${token}:\\s*)[^;]+`, 's');
      if (!rule.test(css)) fail(`browser export is missing ${selector} --${token}`);
      css = css.replace(rule, `$1${value}`);
    }
  }
  const output = resolve(repo, `.tools/${id}-edited.css`);
  await writeFile(output, css);
  return output;
}

async function waitForEditor(child, logPath) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const log = await readFile(logPath, 'utf8').catch(() => '');
      fail(`server exited before becoming ready${log ? `:\n${log}` : ''}`);
    }
    if (await editorIsReady()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  fail(`editor did not become ready within 120 seconds; inspect ${logPath}`);
}

async function setup(repo) {
  run('pnpm', ['tweakcn:setup'], { cwd: repo, inherit: true });
}

async function start(repo, id) {
  const existing = await currentPid(repo);
  if (existing && isAlive(existing)) fail(`server already running as PID ${existing}; use load ${id}`);
  if (await editorIsReady()) fail('port 3000 already serves tweakcn outside this managed session');
  const occupied = await fetch(EDITOR_URL).catch(() => null);
  if (occupied) fail('port 3000 is already in use');

  const checkout = JSON.parse(await readFile(resolve(repo, 'tools/tweakcn.config.json'), 'utf8'))
    .checkout;
  if (!existsSync(resolve(repo, checkout, '.git'))) {
    fail('pinned checkout is missing; run setup once, then start again');
  }
  const cssPath = await exportPalette(repo, id);
  const stateDir = resolve(repo, STATE_DIR);
  await mkdir(stateDir, { recursive: true });
  const logPath = resolve(repo, LOG_FILE);
  const log = await open(logPath, 'w');
  const child = spawn('node', ['tools/tweakcn.mjs', 'dev'], {
    cwd: repo,
    detached: true,
    stdio: ['ignore', log.fd, log.fd],
  });
  child.unref();
  await writeFile(resolve(repo, PID_FILE), `${child.pid}\n`);
  try {
    await waitForEditor(child, logPath);
  } catch (error) {
    if (isAlive(child.pid)) process.kill(-child.pid, 'SIGTERM');
    await rm(resolve(repo, PID_FILE), { force: true });
    throw error;
  } finally {
    await log.close();
  }

  browser(['close'], { allowFailure: true });
  browser(['open', EDITOR_URL]);
  const baseline = await selectPresetInBrowser(id, cssPath);
  await recordLoadedPalette(repo, id, baseline);
  console.log(JSON.stringify({ palette: id, url: EDITOR_URL, css: cssPath, pid: child.pid, log: logPath }));
}

async function load(repo, id) {
  const pid = await currentPid(repo);
  if (!pid || !isAlive(pid) || !(await editorIsReady())) fail('managed tweakcn is not running; use start <palette>');
  const cssPath = await exportPalette(repo, id);
  const baseline = await selectPresetInBrowser(id, cssPath);
  await recordLoadedPalette(repo, id, baseline);
  console.log(JSON.stringify({ palette: id, url: EDITOR_URL, css: cssPath, pid }));
}

async function stop(repo) {
  browser(['close'], { allowFailure: true });
  const pid = await currentPid(repo);
  if (!pid || !isAlive(pid)) {
    await rm(resolve(repo, PID_FILE), { force: true });
    await rm(resolve(repo, BASELINE_FILE), { force: true });
    await rm(resolve(repo, ACTIVE_PALETTE_FILE), { force: true });
    console.log('tweakcn-session: not running');
    return;
  }
  process.kill(-pid, 'SIGTERM');
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && isAlive(pid)) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (isAlive(pid)) fail(`PID ${pid} did not stop after SIGTERM`);
  await rm(resolve(repo, PID_FILE), { force: true });
  await rm(resolve(repo, BASELINE_FILE), { force: true });
  await rm(resolve(repo, ACTIVE_PALETTE_FILE), { force: true });
  console.log(`tweakcn-session: stopped PID ${pid}`);
}

async function status(repo) {
  const pid = await currentPid(repo);
  const running = Boolean(pid && isAlive(pid));
  const ready = running && (await editorIsReady());
  console.log(JSON.stringify({ running, ready, pid: running ? pid : null, url: EDITOR_URL, log: resolve(repo, LOG_FILE) }));
  if (!ready) process.exitCode = 1;
}

async function logs(repo) {
  const path = resolve(repo, LOG_FILE);
  if (!existsSync(path)) fail('no managed server log exists');
  process.stdout.write(await readFile(path, 'utf8'));
}

async function apply(repo, id, input, write) {
  const path = resolve(input ?? resolve(repo, `.tools/${id}-edited.css`));
  if (!existsSync(path)) fail(`edited export does not exist: ${path}`);
  const args = ['theme:tweakcn:apply', '--', '--palette', id, '--input', path];
  if (write) args.push('--write');
  run('pnpm', args, { cwd: repo, inherit: true });
}

async function browserExport(repo, id) {
  const pid = await currentPid(repo);
  if (!pid || !isAlive(pid) || !(await editorIsReady())) fail('managed tweakcn is not running');
  const activePalette = await readFile(resolve(repo, ACTIVE_PALETTE_FILE), 'utf8').catch(() => '');
  const baseline = activePalette.trim() === id
    ? await readFile(resolve(repo, BASELINE_FILE), 'utf8').catch(() => '')
    : '';
  const path = await captureFromBrowser(repo, id, baseline || undefined);
  console.log(`tweakcn-session: captured ${path}`);
  await apply(repo, id, path, false);
}

async function verifyPresets(repo) {
  const pid = await currentPid(repo);
  if (!pid || !isAlive(pid) || !(await editorIsReady())) fail('managed tweakcn is not running');
  const verified = [];
  for (const id of PALETTES) {
    const cssPath = await exportPalette(repo, id);
    const baseline = await selectPresetInBrowser(id, cssPath);
    await recordLoadedPalette(repo, id, baseline);
    const path = await captureFromBrowser(repo, id, baseline);
    const result = execute(
      'pnpm',
      ['theme:tweakcn:apply', '--', '--palette', id, '--input', path],
      { cwd: repo },
    );
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    if (!/No changes\./.test(output)) fail(`${id} preset does not round-trip to zero changes:\n${output}`);
    verified.push(PALETTE_PRESETS[id].label);
  }
  console.log(JSON.stringify({ verified }));
}

function usage() {
  fail(`usage:
  tweakcn-session.mjs setup
  tweakcn-session.mjs start <palette>
  tweakcn-session.mjs load <palette>
  tweakcn-session.mjs export <palette>
  tweakcn-session.mjs dry-run <palette> [edited.css]
  tweakcn-session.mjs apply <palette> [edited.css] --write
  tweakcn-session.mjs verify-presets
  tweakcn-session.mjs status
  tweakcn-session.mjs logs
  tweakcn-session.mjs stop`);
}

export function parseSessionArgs(argv) {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  if (args.length > 4) usage();
  const [command, rawPalette, maybeInput, maybeWrite] = args;
  if (command === 'setup' && !rawPalette) return { command };
  if (['start', 'load', 'export'].includes(command) && rawPalette && !maybeInput) {
    return { command, palette: requirePalette(rawPalette) };
  }
  if (command === 'dry-run' && rawPalette && !maybeWrite) {
    return { command, palette: requirePalette(rawPalette), input: maybeInput };
  }
  if (
    command === 'apply' &&
    rawPalette &&
    ((maybeInput === '--write' && !maybeWrite) || (maybeInput && maybeWrite === '--write'))
  ) {
    return {
      command,
      palette: requirePalette(rawPalette),
      input: maybeInput === '--write' ? undefined : maybeInput,
    };
  }
  if (['verify-presets', 'status', 'logs', 'stop'].includes(command) && !rawPalette) {
    return { command };
  }
  usage();
}

export async function main(argv = process.argv.slice(2)) {
  const repo = repositoryRoot();
  const parsed = parseSessionArgs(argv);
  if (parsed.command === 'setup') await setup(repo);
  else if (parsed.command === 'start') await start(repo, parsed.palette);
  else if (parsed.command === 'load') await load(repo, parsed.palette);
  else if (parsed.command === 'export') await browserExport(repo, parsed.palette);
  else if (parsed.command === 'dry-run') await apply(repo, parsed.palette, parsed.input, false);
  else if (parsed.command === 'apply') await apply(repo, parsed.palette, parsed.input, true);
  else if (parsed.command === 'verify-presets') await verifyPresets(repo);
  else if (parsed.command === 'status') await status(repo);
  else if (parsed.command === 'logs') await logs(repo);
  else await stop(repo);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

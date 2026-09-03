import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';

import {
  EDITOR_URL,
  FORBIDDEN_EDITOR_CONTROL_NAMES,
  FORBIDDEN_REQUEST_PATTERNS,
  PALETTE_PRESETS,
  editorShellAssertionSource,
  mobileExportAssertionSource,
  parseSessionArgs,
  presetSelectionSource,
  presetValidationSource,
  repositoryRoot,
  requestObservationFinishSource,
  requestObservationStartSource,
  requirePalette,
} from './tweakcn-session.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('repository-local session resolves the repository from its own location', () => {
  assert.equal(repositoryRoot(), ROOT);
});

test('repository-local session exposes every named palette preset', () => {
  assert.equal(EDITOR_URL, 'http://localhost:3000/');
  assert.deepEqual(Object.keys(PALETTE_PRESETS), [
    'suse',
    'claymorphism',
    'cleanslate',
    'modern-minimal',
    'supabase',
  ]);
  assert.equal(requirePalette('supabase'), 'supabase');
  assert.throws(() => requirePalette('unknown'), /unknown palette/i);
});

test('managed browser assertion scopes forbidden controls and cloud request patterns', () => {
  assert.deepEqual(FORBIDDEN_EDITOR_CONTROL_NAMES, [
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
  assert.equal(FORBIDDEN_REQUEST_PATTERNS.every((pattern) => pattern instanceof RegExp), true);
  assert.equal(FORBIDDEN_REQUEST_PATTERNS.some((pattern) => pattern.test('/api/auth/get-session')), true);
  assert.equal(FORBIDDEN_REQUEST_PATTERNS.some((pattern) => pattern.test('/api/themes')), true);
  assert.equal(FORBIDDEN_REQUEST_PATTERNS.some((pattern) => pattern.test('/api/subscription')), true);
  assert.equal(FORBIDDEN_REQUEST_PATTERNS.some((pattern) => pattern.test('/r/v0/theme.json')), true);

  const source = editorShellAssertionSource();
  assert.match(source, /pathname !== '\/'/);
  assert.match(source, /getByRole\('button', \{ name: 'Export CSS'/);
  assert.match(source, /literal label visible/);
  assert.match(source, /exactly one visible Export CSS action/);
  assert.match(source, /Theme Code/);
  assert.match(source, /index\.css/);
  assert.match(source, /header/);
  assert.match(source, /actionBar/);
  assert.match(source, /controlPanel/);
  assert.match(source, /codeDialog/);
  assert.doesNotMatch(source, /document\.body\.innerText/);

  const mobile = mobileExportAssertionSource();
  assert.match(mobile, /width: 767/);
  assert.match(mobile, /getByRole\('tab', \{ name: 'Preview'/);
  assert.match(mobile, /Export CSS/);
  assert.match(mobile, /setViewportSize\(originalViewport\)/);
});

test('managed browser workflow splits request observation, preset selection, and validation', () => {
  const start = requestObservationStartSource();
  const selection = presetSelectionSource('suse');
  const validation = presetValidationSource('suse', {
    light: { background: 'oklch(1 0 0)', primary: 'oklch(0.7 0.15 157)', 'chart-5': 'oklch(0.8 0.05 35)', 'sidebar-ring': 'oklch(0.7 0.15 157)', destructive: 'oklch(0.5 0.2 30)', radius: '0.5rem' },
    dark: { background: 'oklch(0.2 0 0)', primary: 'oklch(0.7 0.15 157)', 'chart-5': 'oklch(0.8 0.05 35)', 'sidebar-ring': 'oklch(0.7 0.15 157)', destructive: 'oklch(0.6 0.2 30)' },
  });
  const finish = requestObservationFinishSource();

  assert.match(start, /page\.__csfForbiddenRequests = \[\]/);
  assert.match(selection, /http:\/\/localhost:3000\//);
  assert.match(selection, /pathname !== '\/'/);
  assert.match(selection, /redirected away from/);
  assert.match(selection, /CSF-SUSE/);
  assert.doesNotMatch(selection, /editorShellAssertionSource/);
  assert.match(validation, /stale\/invalid runtime preset CSF-SUSE/);
  assert.match(finish, /forbidden local editor request/);
});

test('session argument parser accepts lifecycle commands and palette arguments', () => {
  assert.deepEqual(parseSessionArgs(['setup']), { command: 'setup' });
  assert.deepEqual(parseSessionArgs(['--', 'start', 'suse']), { command: 'start', palette: 'suse' });
  assert.deepEqual(parseSessionArgs(['--', 'export', 'supabase']), { command: 'export', palette: 'supabase' });
  assert.deepEqual(parseSessionArgs(['start', 'suse']), { command: 'start', palette: 'suse' });
  assert.deepEqual(parseSessionArgs(['load', 'modern-minimal']), {
    command: 'load',
    palette: 'modern-minimal',
  });
  assert.deepEqual(parseSessionArgs(['export', 'supabase']), {
    command: 'export',
    palette: 'supabase',
  });
  assert.deepEqual(parseSessionArgs(['dry-run', 'cleanslate', '.tools/custom.css']), {
    command: 'dry-run',
    palette: 'cleanslate',
    input: '.tools/custom.css',
  });
  assert.deepEqual(parseSessionArgs(['apply', 'claymorphism', '--write']), {
    command: 'apply',
    palette: 'claymorphism',
    input: undefined,
  });
  assert.deepEqual(parseSessionArgs(['apply', 'suse', '.tools/suse-edited.css', '--write']), {
    command: 'apply',
    palette: 'suse',
    input: '.tools/suse-edited.css',
  });
  assert.deepEqual(parseSessionArgs(['verify-presets']), { command: 'verify-presets' });
  assert.deepEqual(parseSessionArgs(['status']), { command: 'status' });
  assert.deepEqual(parseSessionArgs(['logs']), { command: 'logs' });
  assert.deepEqual(parseSessionArgs(['stop']), { command: 'stop' });
});

test('session argument parser rejects incomplete and unsafe command shapes', () => {
  assert.throws(() => parseSessionArgs([]), /usage/i);
  assert.throws(() => parseSessionArgs(['start']), /usage/i);
  assert.throws(() => parseSessionArgs(['start', 'unknown']), /unknown palette/i);
  assert.throws(() => parseSessionArgs(['apply', 'suse']), /usage/i);
  assert.throws(() => parseSessionArgs(['apply', 'suse', '--write', 'extra']), /usage/i);
  assert.throws(() => parseSessionArgs(['status', 'extra']), /usage/i);
});

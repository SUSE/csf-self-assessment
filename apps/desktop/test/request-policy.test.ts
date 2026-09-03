import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decideNavigation,
  decideRuntimeRequest,
  denyPermission,
  denyPermissionCheck,
  denyWindowOpen,
  preventWebView,
} from '../src/request-policy.js';
import { ASSESSMENT_TARGET, AUTHOR_TARGET } from '../src/target.js';

for (const requestUrl of [
  'csf://author/',
  'data:text/plain,fixture',
  'blob:csf://author/fixture-id',
]) {
  test(`the runtime allows local request ${requestUrl}`, () => {
    assert.deepEqual(
      decideRuntimeRequest(AUTHOR_TARGET, new URL(requestUrl)),
      { kind: 'allow-local' },
    );
  });
}

for (const requestUrl of [
  'csf://assessment/',
  'csf://author/other',
  'https://example.invalid/',
  'http://example.invalid/',
  'ws://example.invalid/',
  'wss://example.invalid/',
  'file:///tmp/author.html',
  'javascript:void(0)',
  'blob:csf://assessment/fixture-id',
  'blob:https://example.invalid/fixture-id',
  'blob:null/fixture-id',
]) {
  test(`the runtime denies external request ${requestUrl}`, () => {
    assert.deepEqual(
      decideRuntimeRequest(AUTHOR_TARGET, new URL(requestUrl)),
      { kind: 'deny-external' },
    );
  });
}

test('desktop navigation allows only a main-frame reload of its own start URL', () => {
  assert.deepEqual(
    decideNavigation(ASSESSMENT_TARGET, 'csf://assessment/', true),
    { kind: 'allow-self' },
  );
  assert.deepEqual(decideNavigation(AUTHOR_TARGET, 'csf://author/', true), {
    kind: 'allow-self',
  });

  for (const [target, navigationUrl, isMainFrame] of [
    [ASSESSMENT_TARGET, 'csf://assessment/', false],
    [AUTHOR_TARGET, 'csf://assessment/', true],
    [ASSESSMENT_TARGET, 'csf://author/', true],
    [ASSESSMENT_TARGET, 'csf://assessment/questions', true],
    [ASSESSMENT_TARGET, 'csf://assessment', true],
    [ASSESSMENT_TARGET, 'https://example.invalid/desktop-s2-navigation', true],
    [ASSESSMENT_TARGET, 'file:///etc/passwd', true],
    [ASSESSMENT_TARGET, '', true],
  ] as const) {
    assert.deepEqual(decideNavigation(target, navigationUrl, isMainFrame), {
      kind: 'deny',
    });
  }
});

test('webview events are prevented once', () => {
  let webViewPreventions = 0;

  preventWebView({
    preventDefault() {
      webViewPreventions += 1;
    },
  });

  assert.equal(webViewPreventions, 1);
});

test('new windows and permissions are denied', () => {
  const callbackValues: boolean[] = [];

  assert.deepEqual(denyWindowOpen(), { action: 'deny' });
  denyPermission((allowed) => callbackValues.push(allowed));
  assert.deepEqual(callbackValues, [false]);
  assert.equal(denyPermissionCheck(), false);
});

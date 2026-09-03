import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DESKTOP_CSP,
  decideRendererRequest,
  rendererResponse,
} from '../src/protocol-policy.js';
import { AUTHOR_TARGET } from '../src/target.js';

const FIXTURE = new TextEncoder().encode(
  '<!doctype html><title>fixture</title>',
);

const EXPECTED_CSP_DIRECTIVES = new Set([
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
]);

test('the matching renderer request serves the captured HTML', async () => {
  const decision = decideRendererRequest(
    AUTHOR_TARGET,
    new URL('csf://author/'),
    FIXTURE,
  );
  const response = rendererResponse(decision);

  assert.equal(decision.kind, 'serve');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    FIXTURE,
  );
  assert.deepEqual(
    new Set(
      DESKTOP_CSP.split(';')
        .map((directive) => directive.trim())
        .filter((directive) => directive.length > 0),
    ),
    EXPECTED_CSP_DIRECTIVES,
  );
  assert.equal(response.headers.get('content-security-policy'), DESKTOP_CSP);
});

for (const requestUrl of [
  'csf://author/other',
  'csf://assessment/',
  'file:///tmp/author.html',
  'https://example.invalid/',
]) {
  test(`the renderer refuses ${requestUrl}`, async () => {
    const decision = decideRendererRequest(
      AUTHOR_TARGET,
      new URL(requestUrl),
      FIXTURE,
    );
    const response = rendererResponse(decision);

    assert.deepEqual(decision, { kind: 'refuse' });
    assert.equal(response.status, 404);
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  });
}

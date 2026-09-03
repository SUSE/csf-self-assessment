import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decideDesktopBridgeSender,
  type DesktopBridgeOwner,
  type DesktopBridgeSender,
} from '../src/bridge-policy.js';

const owner: DesktopBridgeOwner = { webContentsId: 7, startUrl: 'csf://author/' };

test('desktop bridge sender policy allows only its main frame and exact URL', () => {
  assert.deepEqual(
    decideDesktopBridgeSender(owner, {
      webContentsId: 7,
      frameUrl: 'csf://author/',
      frameKind: 'main',
    }),
    { kind: 'allow' },
  );
  assert.deepEqual(
    decideDesktopBridgeSender(owner, {
      webContentsId: 8,
      frameUrl: 'csf://author/',
      frameKind: 'main',
    }),
    { kind: 'deny', reason: 'wrong-web-contents' },
  );

  const deniedFrameKinds: DesktopBridgeSender['frameKind'][] = ['subframe', 'missing'];
  for (const frameKind of deniedFrameKinds) {
    assert.deepEqual(
      decideDesktopBridgeSender(owner, {
        webContentsId: 7,
        frameUrl: 'csf://author/',
        frameKind,
      }),
      { kind: 'deny', reason: 'wrong-frame' },
    );
  }

  for (const frameUrl of ['csf://assessment/', 'csf://author/other']) {
    assert.deepEqual(
      decideDesktopBridgeSender(owner, {
        webContentsId: 7,
        frameUrl,
        frameKind: 'main',
      }),
      { kind: 'deny', reason: 'wrong-url' },
    );
  }
});

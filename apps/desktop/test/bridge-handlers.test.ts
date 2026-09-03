import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_JSON_FILE_BYTES } from '../src/bridge-contract.js';
import {
  createDesktopBridgeHandlers,
  DesktopBridgeAccessError,
  type NativeJsonFileService,
} from '../src/bridge-handlers.js';
import type { DesktopBridgeOwner, DesktopBridgeSender } from '../src/bridge-policy.js';

const owner: DesktopBridgeOwner = { webContentsId: 7, startUrl: 'csf://author/' };
const allowedSender: DesktopBridgeSender = {
  webContentsId: 7,
  frameUrl: 'csf://author/',
  frameKind: 'main',
};

function countingService() {
  let openCount = 0;
  let saveCount = 0;
  let savedInput: Parameters<NativeJsonFileService['saveJsonFile']>[0] | undefined;
  const files: NativeJsonFileService = {
    async openJsonFile() {
      openCount += 1;
      return { name: 'workbook.json', text: '{"ok":true}' };
    },
    async saveJsonFile(input) {
      saveCount += 1;
      savedInput = input;
    },
  };

  return {
    files,
    counts: () => ({ openCount, saveCount }),
    savedInput: () => savedInput,
  };
}

test('desktop bridge handlers pass valid open, cancellation, and save calls', async () => {
  const service = countingService();
  const handlers = createDesktopBridgeHandlers(owner, service.files);

  assert.deepEqual(await handlers.openJsonFile(allowedSender, []), {
    name: 'workbook.json',
    text: '{"ok":true}',
  });
  assert.deepEqual(service.counts(), { openCount: 1, saveCount: 0 });

  const cancelledFiles: NativeJsonFileService = {
    async openJsonFile() {
      return null;
    },
    async saveJsonFile() {},
  };
  assert.equal(
    await createDesktopBridgeHandlers(owner, cancelledFiles).openJsonFile(allowedSender, []),
    null,
  );

  await handlers.saveJsonFile(allowedSender, {
    suggestedName: 'partial.json',
    text: '{}',
  });
  assert.deepEqual(service.savedInput(), { suggestedName: 'partial.json', text: '{}' });
  assert.deepEqual(service.counts(), { openCount: 1, saveCount: 1 });
});

test('desktop bridge handlers reject untrusted calls before native work', async () => {
  const service = countingService();
  const handlers = createDesktopBridgeHandlers(owner, service.files);
  const deniedSenders: DesktopBridgeSender[] = [
    { webContentsId: 8, frameUrl: 'csf://author/', frameKind: 'main' },
    { webContentsId: 7, frameUrl: 'csf://author/', frameKind: 'subframe' },
    { webContentsId: 7, frameUrl: 'csf://author/', frameKind: 'missing' },
    { webContentsId: 7, frameUrl: 'csf://assessment/', frameKind: 'main' },
    { webContentsId: 7, frameUrl: 'csf://author/other', frameKind: 'main' },
  ];

  for (const sender of deniedSenders) {
    await assert.rejects(handlers.openJsonFile(sender, []), DesktopBridgeAccessError);
    await assert.rejects(
      handlers.saveJsonFile(sender, { suggestedName: 'partial.json', text: '{}' }),
      DesktopBridgeAccessError,
    );
  }
  assert.deepEqual(service.counts(), { openCount: 0, saveCount: 0 });

  await assert.rejects(handlers.openJsonFile(allowedSender, ['extra']));
  assert.deepEqual(service.counts(), { openCount: 0, saveCount: 0 });

  const invalidSavePayloads = [
    { suggestedName: 'estate.json' },
    { suggestedName: 'estate.json', text: '{}', path: '/tmp/estate.json' },
    { suggestedName: '.json', text: '{}' },
    { suggestedName: '../estate.json', text: '{}' },
    { suggestedName: 'estate.txt', text: '{}' },
    { suggestedName: `${'é'.repeat(125)}a.json`, text: '{}' },
    { suggestedName: 'estate.json', text: 'a'.repeat(MAX_JSON_FILE_BYTES + 1) },
  ];

  for (const payload of invalidSavePayloads) {
    await assert.rejects(handlers.saveJsonFile(allowedSender, payload));
    assert.deepEqual(service.counts(), { openCount: 0, saveCount: 0 });
  }
});

test('desktop bridge handlers preserve native service errors', async () => {
  const serviceError = new Error('native failure');
  const files: NativeJsonFileService = {
    async openJsonFile() {
      throw serviceError;
    },
    async saveJsonFile() {
      throw serviceError;
    },
  };
  const handlers = createDesktopBridgeHandlers(owner, files);

  const openError = await handlers.openJsonFile(allowedSender, []).catch((error: Error) => error);
  assert.equal(openError, serviceError);
  const saveError = await handlers
    .saveJsonFile(allowedSender, { suggestedName: 'partial.json', text: '{}' })
    .catch((error: Error) => error);
  assert.equal(saveError, serviceError);
});

import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';

import {
  OPEN_JSON_CHANNEL,
  SAVE_JSON_CHANNEL,
} from './bridge-contract.js';
import { createDesktopBridgeHandlers } from './bridge-handlers.js';
import type { DesktopBridgeSender } from './bridge-policy.js';
import { createNativeJsonFileService } from './native-json-files.js';
import type { DesktopTarget } from './target.js';

export function desktopBridgeSenderOf(
  event: IpcMainInvokeEvent,
): DesktopBridgeSender {
  const senderFrame = event.senderFrame;
  return {
    webContentsId: event.sender.id,
    frameUrl: senderFrame?.url ?? '',
    frameKind:
      senderFrame === null
        ? 'missing'
        : senderFrame === event.sender.mainFrame
          ? 'main'
          : 'subframe',
  };
}

export function installDesktopBridge(
  ownerWindow: BrowserWindow,
  target: DesktopTarget,
): void {
  const handlers = createDesktopBridgeHandlers(
    { webContentsId: ownerWindow.webContents.id, startUrl: target.startUrl },
    createNativeJsonFileService(ownerWindow),
  );

  ipcMain.handle(OPEN_JSON_CHANNEL, (event, ...payload: unknown[]) =>
    handlers.openJsonFile(desktopBridgeSenderOf(event), payload),
  );
  ipcMain.handle(SAVE_JSON_CHANNEL, (event, payload: unknown) =>
    handlers.saveJsonFile(desktopBridgeSenderOf(event), payload),
  );
}

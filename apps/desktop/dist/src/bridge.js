import { ipcMain } from 'electron';
import { OPEN_JSON_CHANNEL, SAVE_JSON_CHANNEL, } from './bridge-contract.js';
import { createDesktopBridgeHandlers } from './bridge-handlers.js';
import { createNativeJsonFileService } from './native-json-files.js';
export function desktopBridgeSenderOf(event) {
    const senderFrame = event.senderFrame;
    return {
        webContentsId: event.sender.id,
        frameUrl: senderFrame?.url ?? '',
        frameKind: senderFrame === null
            ? 'missing'
            : senderFrame === event.sender.mainFrame
                ? 'main'
                : 'subframe',
    };
}
export function installDesktopBridge(ownerWindow, target) {
    const handlers = createDesktopBridgeHandlers({ webContentsId: ownerWindow.webContents.id, startUrl: target.startUrl }, createNativeJsonFileService(ownerWindow));
    ipcMain.handle(OPEN_JSON_CHANNEL, (event, ...payload) => handlers.openJsonFile(desktopBridgeSenderOf(event), payload));
    ipcMain.handle(SAVE_JSON_CHANNEL, (event, payload) => handlers.saveJsonFile(desktopBridgeSenderOf(event), payload));
}

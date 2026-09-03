import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';
import { installDesktopHistoryShortcuts } from './history-shortcuts.js';
export function createDesktopWindow(target, desktopDistUrl) {
    const window = new BrowserWindow({
        title: target.windowTitle,
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 720,
        show: false,
        webPreferences: {
            preload: fileURLToPath(new URL('preload.js', desktopDistUrl)),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            webviewTag: false,
            devTools: false,
        },
    });
    installDesktopHistoryShortcuts(window.webContents);
    window.once('ready-to-show', () => window.show());
    return window;
}

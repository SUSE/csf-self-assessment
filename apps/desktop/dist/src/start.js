import { app, Menu, session } from 'electron';
import { installDesktopBridge } from './bridge.js';
import { configureDesktopIdentity } from './profile.js';
import { installRendererProtocol, registerDesktopScheme, } from './protocol.js';
import { installApplicationPolicy, installSessionPolicy, } from './security.js';
import { rendererArtifactUrl } from './target.js';
import { createDesktopWindow } from './window.js';
export async function startDesktop(target) {
    await app.whenReady();
    Menu.setApplicationMenu(null);
    const desktopDistUrl = new URL('./', import.meta.url);
    const rendererLocation = app.isPackaged
        ? { kind: 'packaged', resourcesDirectory: process.resourcesPath }
        : { kind: 'workspace', desktopDistUrl };
    const artifactUrl = rendererArtifactUrl(target, rendererLocation);
    await installRendererProtocol(session.defaultSession, target, artifactUrl);
    installSessionPolicy(session.defaultSession, target);
    const window = createDesktopWindow(target, desktopDistUrl);
    installDesktopBridge(window, target);
    await window.loadURL(target.startUrl);
}
export function runDesktop(target) {
    registerDesktopScheme();
    configureDesktopIdentity(app, target);
    installApplicationPolicy(app, target);
    app.on('window-all-closed', () => app.quit());
    void startDesktop(target).catch((error) => {
        console.error(error);
        app.exit(1);
    });
}

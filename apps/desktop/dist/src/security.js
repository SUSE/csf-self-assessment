import { decideNavigation, decideRuntimeRequest, denyPermission, denyPermissionCheck, denyWindowOpen, preventWebView, } from './request-policy.js';
export function installSessionPolicy(electronSession, target) {
    electronSession.webRequest.onBeforeRequest({ urls: ['<all_urls>', 'csf://*/*'] }, (details, callback) => {
        callback({
            cancel: decideRuntimeRequest(target, new URL(details.url)).kind !==
                'allow-local',
        });
    });
    electronSession.setPermissionRequestHandler((_contents, _permission, callback) => denyPermission(callback));
    electronSession.setPermissionCheckHandler(() => denyPermissionCheck());
}
export function installWebContentsPolicy(contents, target) {
    contents.on('will-navigate', (event, url, _isInPlace, isMainFrame) => {
        if (decideNavigation(target, url, isMainFrame).kind === 'deny') {
            event.preventDefault();
        }
    });
    contents.on('will-frame-navigate', (details) => {
        if (decideNavigation(target, details.url, details.isMainFrame).kind === 'deny') {
            details.preventDefault();
        }
    });
    contents.setWindowOpenHandler(() => denyWindowOpen());
    contents.on('will-attach-webview', preventWebView);
}
export function installApplicationPolicy(electronApp, target) {
    electronApp.on('web-contents-created', (_event, contents) => {
        installWebContentsPolicy(contents, target);
    });
}

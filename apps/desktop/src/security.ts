import type { App, Session, WebContents } from 'electron';

import {
  decideNavigation,
  decideRuntimeRequest,
  denyPermission,
  denyPermissionCheck,
  denyWindowOpen,
  preventWebView,
} from './request-policy.js';
import type { DesktopTarget } from './target.js';

export function installSessionPolicy(
  electronSession: Session,
  target: DesktopTarget,
): void {
  electronSession.webRequest.onBeforeRequest(
    { urls: ['<all_urls>', 'csf://*/*'] },
    (details, callback) => {
      callback({
        cancel:
          decideRuntimeRequest(target, new URL(details.url)).kind !==
          'allow-local',
      });
    },
  );
  electronSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => denyPermission(callback),
  );
  electronSession.setPermissionCheckHandler(() => denyPermissionCheck());
}

export function installWebContentsPolicy(
  contents: WebContents,
  target: DesktopTarget,
): void {
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

export function installApplicationPolicy(
  electronApp: App,
  target: DesktopTarget,
): void {
  electronApp.on('web-contents-created', (_event, contents) => {
    installWebContentsPolicy(contents, target);
  });
}

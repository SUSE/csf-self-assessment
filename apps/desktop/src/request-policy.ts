import type { DesktopTarget } from './target.js';

export type RuntimeRequestDecision =
  | { kind: 'allow-local' }
  | { kind: 'deny-external' };

export type NavigationDecision =
  | { kind: 'allow-self' }
  | { kind: 'deny' };

export type PreventableEvent = {
  preventDefault(): void;
};

export type WindowOpenDecision = {
  action: 'deny';
};

export function decideRuntimeRequest(
  target: DesktopTarget,
  requestUrl: URL,
): RuntimeRequestDecision {
  if (requestUrl.href === target.startUrl || requestUrl.protocol === 'data:') {
    return { kind: 'allow-local' };
  }

  if (requestUrl.protocol === 'blob:') {
    let embeddedUrl: URL;

    try {
      embeddedUrl = new URL(requestUrl.pathname);
    } catch {
      return { kind: 'deny-external' };
    }

    const targetUrl = new URL(target.startUrl);
    if (
      embeddedUrl.protocol === targetUrl.protocol &&
      embeddedUrl.host === targetUrl.host &&
      embeddedUrl.username === targetUrl.username &&
      embeddedUrl.password === targetUrl.password
    ) {
      return { kind: 'allow-local' };
    }
  }

  return { kind: 'deny-external' };
}

export function decideNavigation(
  target: DesktopTarget,
  navigationUrl: string,
  isMainFrame: boolean,
): NavigationDecision {
  if (isMainFrame && navigationUrl === target.startUrl) {
    return { kind: 'allow-self' };
  }

  return { kind: 'deny' };
}

export function preventWebView(event: PreventableEvent): void {
  event.preventDefault();
}

export function denyWindowOpen(): WindowOpenDecision {
  return { action: 'deny' };
}

export function denyPermission(callback: (allowed: boolean) => void): void {
  callback(false);
}

export function denyPermissionCheck(): false {
  return false;
}

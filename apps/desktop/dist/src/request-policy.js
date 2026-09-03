export function decideRuntimeRequest(target, requestUrl) {
    if (requestUrl.href === target.startUrl || requestUrl.protocol === 'data:') {
        return { kind: 'allow-local' };
    }
    if (requestUrl.protocol === 'blob:') {
        let embeddedUrl;
        try {
            embeddedUrl = new URL(requestUrl.pathname);
        }
        catch {
            return { kind: 'deny-external' };
        }
        const targetUrl = new URL(target.startUrl);
        if (embeddedUrl.protocol === targetUrl.protocol &&
            embeddedUrl.host === targetUrl.host &&
            embeddedUrl.username === targetUrl.username &&
            embeddedUrl.password === targetUrl.password) {
            return { kind: 'allow-local' };
        }
    }
    return { kind: 'deny-external' };
}
export function decideNavigation(target, navigationUrl, isMainFrame) {
    if (isMainFrame && navigationUrl === target.startUrl) {
        return { kind: 'allow-self' };
    }
    return { kind: 'deny' };
}
export function preventWebView(event) {
    event.preventDefault();
}
export function denyWindowOpen() {
    return { action: 'deny' };
}
export function denyPermission(callback) {
    callback(false);
}
export function denyPermissionCheck() {
    return false;
}

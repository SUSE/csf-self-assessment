export function decideDesktopBridgeSender(owner, sender) {
    if (sender.webContentsId !== owner.webContentsId) {
        return { kind: 'deny', reason: 'wrong-web-contents' };
    }
    if (sender.frameKind !== 'main') {
        return { kind: 'deny', reason: 'wrong-frame' };
    }
    if (sender.frameUrl !== owner.startUrl) {
        return { kind: 'deny', reason: 'wrong-url' };
    }
    return { kind: 'allow' };
}
